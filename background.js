// Define root folder for searches
const FOLDER_NAME = "Searches";
const ILLEGAL_PROTOCOLS = ["chrome", "javascript", "data", "file", "about"];
const IGNORE_CONTENTSCRIPT_PROTOCOLS = ["view-source"];
const IGNORE_CONTENTSCRIPT_DOMAINS = ["accounts-static.cdn.mozilla.net", "accounts.firefox.com", "addons.cdn.mozilla.net",
                                     "addons.mozilla.org", "api.accounts.firefox.com", "content.cdn.mozilla.net", "content.cdn.mozilla.net",
                                     "discovery.addons.mozilla.org", "input.mozilla.org", "install.mozilla.org", "oauth.accounts.firefox.com",
                                     "profile.accounts.firefox.com", "support.mozilla.org", "sync.services.mozilla.com", "testpilot.firefox.com"];

var browserVersion = 0;
var fallbackMode = false;
var query = "";
var rootFolderID = "";

// Get browser version for backwards compatibility
function parseBrowserInfo(info){
  browserVersion = parseInt(info.version.split(".")[0]);
  fallbackMode = (browserVersion < 60) ? true : false;
}

function parseTabUrl(tabId, changeInfo, tabInfo) {
  if (changeInfo.status == "complete") {
    browser.tabs.query({currentWindow: true, active: true}, function (tabs) {
      let tabProtocol = getUrlProtocol(tabs[0].url);
      let tabHostname = getUrlHostname(tabs[0].url);

      console.log(tabProtocol, tabHostname);

      if (IGNORE_CONTENTSCRIPT_PROTOCOLS.includes(tabProtocol)) {
        fallbackMode = true;
      }

      if (IGNORE_CONTENTSCRIPT_DOMAINS.includes(tabHostname)) {
        fallbackMode = true;
      }

      if (browserVersion >= 60 && fallbackMode) {
        rebuildMenu();
      }
    });
  }
}

function getUrlProtocol(url) {
  if (url.indexOf(":") > -1) {
    return url.split(":")[0];
  }
}

function getUrlHostname(url) {
  if (url.indexOf("://") > -1) {
    return url.split('/')[2];
  }
}

function getAllowedContexts() {
  console.log(fallbackMode);
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
  let gettingRootFolder = browser.bookmarks.search({title: FOLDER_NAME});
  gettingRootFolder.then((bookmarks) => {
    if (bookmarks.length > 0) {
      rootFolderID = bookmarks[0].id;

      let gettingSubTree = browser.bookmarks.getSubTree(rootFolderID);
      gettingSubTree.then((bookmarkItems) => {
        if (bookmarkItems[0].children.length > 0) {
          listBookmarksInTree(bookmarkItems[0], rootFolderID);
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

// Parse through all bookmarks in tree and fire populateContextMenu for each:
function listBookmarksInTree(bookmarkItem, rootFolderID) {
  populateContextMenu(bookmarkItem.id, bookmarkItem.title, bookmarkItem.url, bookmarkItem.parentId, bookmarkItem.type, rootFolderID);

  if (bookmarkItem.children) {
    for (child of bookmarkItem.children) {
      listBookmarksInTree(child, rootFolderID);
    }
  }
}

function checkValid(url) {
  let isValidProtocol = false, isValidWildcard = false, isValid = false;

  // Check that URL is not privileged according to
  // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/create

  let protocol = getUrlProtocol(url);
  if (protocol) {
    isValidProtocol = !ILLEGAL_PROTOCOLS.includes(protocol);
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

function makeFavicon(url) {
  let faviconUrl = "";

  if (url.indexOf("://") > -1) {
    faviconUrl = "https://www.google.com/s2/favicons?domain=" + getUrlProtocol(url) + "://" + getUrlHostname(url);
  }

  return faviconUrl;
}

// Show a "Getting Started" link in the context menu if not set up properly
function createHelpLink() {
  browser.menus.create({
    id: "https://github.com/NumeriusNegidius/Context-Search/wiki",
    title: browser.i18n.getMessage("helpMenuLabel"),
    contexts: ["all"],
    onclick: createTab
  }, onSuccess());
}

// Make the context menu
function populateContextMenu(id, title, url, parent, type, rootFolderID) {

  if (id == rootFolderID) {
    //This is the root folder, make the title what is searched for
    browser.menus.create({
      id: rootFolderID,
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
          id: url,
          title: title,
          icons: {
            16: makeFavicon(url)
          },
          enabled: checkValid(url),
          onclick: createTab
        }, onSuccess());
      }
    }

  }
}

function checkBool(val) {
  return (typeof(val) === "boolean") ? val : false;
}

function createTab(info, parentTab) {
  if (query == "%s" || fallbackMode) {
    query = info.selectionText;
  }

  // Check options if tab should open as active or in background
  // Replace the browser standard %s for keyword searches with
  // the selected text on the page and make a tab
  let gettingItem = browser.storage.local.get();
  gettingItem.then((response) => {
    let makeTabActive = response.makeTabActive;
    if (!makeTabActive) {
      makeTabActive = false;
    }

    browser.tabs.create({
      url: info.menuItemId.replace("%s", encodeURIComponent(query)),
      active: checkBool(makeTabActive),
      openerTabId: parentTab.id
    });
  });
}

function rebuildMenu() {
  browser.menus.remove(rootFolderID);
  if (browserVersion >= 60) {
    browser.menus.refresh();
  }
  main();
  console.log("Menu rebuilt!");
}

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
      browser.menus.update(rootFolderID, {
        title: browser.i18n.getMessage("rootMenuLabelImage")
      });
      browser.menus.refresh();
    }
    else {
      browser.menus.update(rootFolderID, {
        title: browser.i18n.getMessage("rootMenuLabel", truncate(query))
      });
      browser.menus.refresh();
    }
  }
}

browser.bookmarks.onCreated.addListener(rebuildMenu);
browser.bookmarks.onRemoved.addListener(rebuildMenu);
browser.bookmarks.onChanged.addListener(rebuildMenu);
browser.bookmarks.onMoved.addListener(rebuildMenu);

browser.runtime.onMessage.addListener(handleQuery);
browser.runtime.getBrowserInfo().then(parseBrowserInfo);

browser.tabs.onUpdated.addListener(parseTabUrl);


main();
