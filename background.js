// Define root folder for searches
const FOLDER_NAME = "Searches";
const URL_TAG = "CSOID:";
const ILLEGAL_BOOKMARK_PROTOCOLS = ["chrome", "javascript", "data", "file", "about"];
const ILLEGAL_CONTENTSCRIPT_PROTOCOLS = ["view-source", "about", "moz-extension"];
const ILLEGAL_CONTENTSCRIPT_DOMAINS = ["accounts-static.cdn.mozilla.net", "accounts.firefox.com", "addons.cdn.mozilla.net",
                                     "addons.mozilla.org", "api.accounts.firefox.com", "content.cdn.mozilla.net", "content.cdn.mozilla.net",
                                     "discovery.addons.mozilla.org", "input.mozilla.org", "install.mozilla.org", "oauth.accounts.firefox.com",
                                     "profile.accounts.firefox.com", "support.mozilla.org", "sync.services.mozilla.com", "testpilot.firefox.com"];
var rootFolderId = "";
var fallbackMode = false;
var query = "";
var activeTabId = 0;
var allBookmarksArray = [];
var faviconList = [];
var helpLink = browser.extension.getURL("/help.html");

// Check to see if the current tab supports content scripts. If not, use the
// fallback mode where only selected text can be used.
// When switching from a tab that require fallback mode to a tab that doesn't
// (and vice versa), the context menu must be rebuilt so that queries aren't
// carried over. Menu rebuilding is only done when necessary, since it is
// supposedly expensive.
function parseTabUrl(tabId) {
  let gettingTabId = browser.tabs.get(tabId);
  gettingTabId.then((response) => {
    let tabProtocol = getUrlProtocol(response.url);
    let tabHostname = getUrlHostname(response.url);

    // All new tabs start out as about:blank. By ignoring those, this code
    // isn't run unnecessarily, since onUpdated will use this function twice.
    if (response.url != "about:blank") {
      let previousFallbackMode = fallbackMode;
      fallbackMode = false;

      if (ILLEGAL_CONTENTSCRIPT_PROTOCOLS.includes(tabProtocol)) {
        fallbackMode = true;
      }

      if (!tabHostname || ILLEGAL_CONTENTSCRIPT_DOMAINS.includes(tabHostname)) {
        fallbackMode = true;
      }

      if (fallbackMode != previousFallbackMode) {
        rebuildMenu();
      }
    }
  });
}

// Extract the protocol part of a URL
function getUrlProtocol(url) {
  if (url.indexOf(":") > -1) {
    return url.split(":")[0];
  }
}

// Extract the hostname part of a URL
function getUrlHostname(url) {
  if (url.indexOf("://") > -1) {
    return url.split("/")[2];
  }
}

// Extract the hash part of a URL
function getUrlHash(url) {
  if (url.indexOf("#") > -1) {
    return url.split("#")[1];
  }
}

// Set the "contexts" parameter in browser.menus.create
// If in fallback mode, only selection is allowed,
// else, all applicable contexts are allowed.
function getAllowedContexts() {
  if (!fallbackMode) {
    return ["selection", "link", "image"];
  }
  else {
    return ["selection"];
  }
}

// Error logging
function onSuccess(n) {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}

// Define how long a string is allowed to be before truncated.
// Used in root menu item. But only working if in fallback mode.
function truncate(val) {
  if (val.length > 20) {
    return val.substr(0, 20) + browser.i18n.getMessage("ellipsis");
  }
  else {
    return val;
  }
}

// Get ID of FOLDER_NAME and the object and pass everything through listBookmarksInTree.
// If no root folder found: Show "Getting Started" help link
function main() {
  getFaviconList();

  let gettingRootFolder = browser.bookmarks.search({title: FOLDER_NAME});
  gettingRootFolder.then((bookmarks) => {
    if (bookmarks.length > 0) {
      rootFolderId = bookmarks[0].id;

      let gettingSubTree = browser.bookmarks.getSubTree(rootFolderId);
      gettingSubTree.then((bookmarkItems) => {
        if (bookmarkItems[0].children.length > 0) {
          listBookmarksInTree(bookmarkItems[0], rootFolderId);
        }
        else {
          createHelpLink();
        }
      });
    }
    else {
      createHelpLink();
    }
  });
}

// Parse through all bookmarks in tree and
// 1) fire populateContextMenu for each
// 2) populate allBookmarksArray
function listBookmarksInTree(bookmarkItem, rootFolderId) {
  populateContextMenu(bookmarkItem.id, bookmarkItem.title, bookmarkItem.url, bookmarkItem.parentId, bookmarkItem.type, rootFolderId);

  if (bookmarkItem.url) {
    allBookmarksArray.push(bookmarkItem.id);
  }

  if (bookmarkItem.children) {
    for (child of bookmarkItem.children) {
      listBookmarksInTree(child, rootFolderId);
    }
  }
}

// Some URLs cannot be used as search engines. Check all bookmark URLs
// in the Searches folder if they are valid.
function checkValid(url) {
  let isValidProtocol = false, isValidWildcard = false, isValid = false;

  // Check that URL is not privileged according to
  // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/create
  let protocol = getUrlProtocol(url);
  if (protocol) {
    isValidProtocol = !ILLEGAL_BOOKMARK_PROTOCOLS.includes(protocol);
  }

  // Check that URL is a keyword search (i.e. containing "%s")
  if (url.indexOf("%s") > -1) {
    isValidWildcard = true;
  }

  if (isValidProtocol && isValidWildcard) {
    isValid = true;
  }
  else {
    console.warn(`Non-conforming url: ${url}. Illegal protocol or missing \"%s\".`);
  }

  return isValid;
}

// Show a "Getting Started" link in the context menu if not set up properly
function createHelpLink() {
  browser.menus.create({
    id: helpLink,
    title: "Context Search – " + browser.i18n.getMessage("titleGettingStarted"),
    contexts: ["all"],
    onclick: createTab
  }, onSuccess());
}

// Make the context menu
function populateContextMenu(id, title, url, parent, type, rootFolderId) {

  if (id == rootFolderId) {
    //This is the root folder, make the title what is searched for
    browser.menus.create({
      id: rootFolderId,
      title: browser.i18n.getMessage("rootMenuLabel", "%s"),
      contexts: getAllowedContexts()
    }, onSuccess());
  }
  else {

    if (!url) {
      // These are the folders
      browser.menus.create({
        parentId: parent,
        id: id,
        title: title,
        icons: {
          16: "icons/folder.svg"
        }
      }, onSuccess());
    }

    else {
      if (type == "separator") {
        // These are the separators
        browser.menus.create({
          parentId: parent,
          id: id,
          type: "separator"
        }, onSuccess());
      }

      if (url && title) {
        // These are the bookmarks
        browser.menus.create({
          parentId: parent,
          id: id + ";" + url,
          title: title,
          icons: {
            16: makeFavicon(id)
          },
          enabled: checkValid(url),
          onclick: createTab
        }, onSuccess());
      }
    }

  }
}

// Create the new tab with the search result.
function createTab(info, parentTab) {
  // If in fallback mode, content scripts cannot be utilized.
  // If so, make sure the selected text is used for search.
  if (query == "%s" || fallbackMode) {
    query = info.selectionText;
  }
  let bookmarkId = info.menuItemId.split(";")[0];
  let url = info.menuItemId.split(";")[1].replace("%s", encodeURIComponent(query));

  let doTag = true;

  let index = faviconList.findIndex(function(item){
    return item.id === bookmarkId;
  });

  if (index > -1) {
    let dateNow = new Date(getCurrentDate());
    let dateStored = new Date(faviconList[index].dt);
    if ((dateNow - dateStored) < 14) {
      doTag = false;
    }
  }
  if (url.indexOf("#") > -1) {
    doTag = false;
  }
  if (doTag) {
    url += "#" + URL_TAG + bookmarkId
  }

  // Check options if tab should open as active or in background
  // Replace the browser standard %s for keyword searches with
  // the selected text on the page and make a tab
  let gettingItem = browser.storage.local.get();
  gettingItem.then((response) => {
    let makeTabActive = response.makeTabActive;
    if (makeTabActive == undefined) {
      makeTabActive = true;
    }
    browser.tabs.create({
      url: url,
      active: makeTabActive,
      openerTabId: parentTab.id
    });
  });
}

// Rebuild the entire menu and reset allBookmarksArray.
function rebuildMenu() {
  getFaviconList();
  browser.menus.remove(rootFolderId);
  browser.menus.remove(helpLink);
  browser.menus.refresh();
  allBookmarksArray = [];

  main();
}

// Take care of the message sent from query.js. When in fallback mode
// content scripts cannot be utilized. Thus this function should be ignored.
function handleQuery(response) {
  if (!fallbackMode) {
    query = response.query;
    elementType = response.elementType;

    if (!query && (elementType == "IMG" || elementType == "A")) {
      // Remove contextmenu when query is empty but
      // browser.menus will want to show it because of its contexts.
      // The menu must then be rebuilt to recieve future input
      rebuildMenu();
    }
    else if (elementType == "IMG") {
      browser.menus.update(rootFolderId, {
        title: browser.i18n.getMessage("rootMenuLabelImage")
      });
      browser.menus.refresh();
    }
    else {
      browser.menus.update(rootFolderId, {
        title: browser.i18n.getMessage("rootMenuLabel", truncate(query))
      });
      browser.menus.refresh();
    }
  }
}

// Create a string with the current date in YYYY-MM-DD format
function getCurrentDate() {
  let dateNow = new Date();
  return dateNow.toISOString().substr(0,10);
}

function makeFavicon(id) {
  let faviconUrl = "";
  let index = faviconList.findIndex(function(item){
    return item.id === id;
  });
  if (index > -1) {
    faviconUrl = faviconList[index].url;
  }
  if (!faviconUrl) {
    faviconUrl = "icons/defaultFavicon.svg";
  }
  return faviconUrl;
}

// Fetch the list of all favicons from storage.
function getFaviconList() {
  let gettingFavicons = browser.storage.local.get();

  gettingFavicons.then((response) => {
    faviconList = response.faviconList;
    if (!faviconList) {
      faviconList = [];
    }
  });
}

function handleFavicon(faviconUrl, bookmarkId) {
  if (bookmarkId && bookmarkId.indexOf(URL_TAG) > -1) {
    bookmarkId = decodeURIComponent(bookmarkId.replace(URL_TAG, ""));
    if (allBookmarksArray.includes(bookmarkId)) {
      storeFavicon(bookmarkId, faviconUrl);
    }
  }
}

// If on a tab which URL is tagged with the URL_TAG, store the
// tab's favicon URL and date of storage.
function storeFavicon(bookmarkId, faviconUrl) {
  let changeMade = false;

  // Find index of bookmarkId.
  let index;
  index = faviconList.findIndex(function(item){
    return item.id === bookmarkId;
  });

  // If bookmarkId not in list, add it, it's favicon's URL and date stored.
  // Else change the value of URL and date stored
  if (index == -1) {
    addFavicon = {"id" : bookmarkId, "url" : faviconUrl, "dt" : getCurrentDate()};
    faviconList.push(addFavicon);
    changeMade = true;
  }
  else if (faviconList[index].url != faviconUrl){
    faviconList[index].url = faviconUrl;
    faviconList[index].dt = getCurrentDate();
    changeMade = true;
  }

  // Store JSON in local storage and rebuild the menu so that the favicon is showed instantlys
  if (changeMade) {
    browser.storage.local.set({faviconList: faviconList});
    rebuildMenu();
  }
}

// Add some listeners for when bookmarks in the Searches folder is edited
browser.bookmarks.onCreated.addListener(rebuildMenu);
browser.bookmarks.onRemoved.addListener(rebuildMenu);
browser.bookmarks.onChanged.addListener(rebuildMenu);
browser.bookmarks.onMoved.addListener(rebuildMenu);

browser.tabs.onActivated.addListener(function(info) {
  activeTabId = info.tabId;
  parseTabUrl(info.tabId);
});

browser.tabs.onUpdated.addListener(function(tabId, changeInfo, tabInfo) {
  // Only run this code on the active tab.
  if (changeInfo.status == "loading" && tabId == activeTabId) {
    parseTabUrl(tabId);
  }
  if (changeInfo.status == "complete" && tabInfo.favIconUrl) {
    handleFavicon(tabInfo.favIconUrl, getUrlHash(tabInfo.url));
  }
});

// Recieve messages from query.js
browser.runtime.onMessage.addListener(handleQuery);

main();
