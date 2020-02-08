// Define root folder for searches
const FOLDER_NAME = "Searches";
const ILLEGAL_BOOKMARK_PROTOCOLS = ["chrome", "javascript", "data", "file", "about"];
const ILLEGAL_CONTENTSCRIPT_PROTOCOLS = ["view-source", "about", "moz-extension"];
const ILLEGAL_FILETYPES = ["PDF"];
const ILLEGAL_CONTENTSCRIPT_DOMAINS = ["accounts-static.cdn.mozilla.net", "accounts.firefox.com", "addons.cdn.mozilla.net",
                                     "addons.mozilla.org", "api.accounts.firefox.com", "content.cdn.mozilla.net", "content.cdn.mozilla.net",
                                     "discovery.addons.mozilla.org", "input.mozilla.org", "install.mozilla.org", "oauth.accounts.firefox.com",
                                     "profile.accounts.firefox.com", "support.mozilla.org", "sync.services.mozilla.com", "testpilot.firefox.com"];
const HELP_LINK = browser.extension.getURL("/help.html");

var rootFolderId = "";
var fallbackMode = false;
var query = "";
var activeTabId = 0;
var showMultiOption = false;
var showFavicons = false;
var menuRebuilt = false;

function parsePlatformInfo(info) {
  os = info.os;
}

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
    let tabFiletype = getUrlFiletype(response.url);

    // All new tabs start out as about:blank. By ignoring those, this code
    // isn't run unnecessarily, since onUpdated will use this function twice.
    if (response.url != "about:blank") {
      let prevFallbackMode = fallbackMode;
      fallbackMode = false;

      if (ILLEGAL_CONTENTSCRIPT_PROTOCOLS.includes(tabProtocol)) {
        fallbackMode = true;
      }

      if (!tabHostname || ILLEGAL_CONTENTSCRIPT_DOMAINS.includes(tabHostname)) {
        fallbackMode = true;
      }

      if (ILLEGAL_FILETYPES.includes(tabFiletype)) {
        fallbackMode = true;
      }

      if (fallbackMode != prevFallbackMode) {
        rebuildMenu();
      }
    }
  });
}

// Get user prefs. If changed since last load, run rebuildMenu()
function getOptions() {
  let gettingItem = browser.storage.local.get();
  gettingItem.then((response) => {
    let prevShowMultiOption = showMultiOption;
    let prevShowFavicons = showFavicons;

    showMultiOption = response.showMultiOption;
    showFavicons = response.showFavicons;

    if (showMultiOption == undefined) {
      showMultiOption = true;
    }

    if (showFavicons == undefined) {
      showFavicons = true;
    }

    if (showMultiOption != prevShowMultiOption || showFavicons != prevShowFavicons) {
      rebuildMenu();
    }
  });
}

// Ampersands (&) are used as modifiers for access keys in menus.
// As this is not desirable in CSO, these must be escaped as &&
function encodeAmpersand(str) {
  return str.replace(/&/g, "&&")
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

// Extract the file extension part of a URL This is a hack until bug 1457500 in
// Firefox is fixed
// This is only used for PDFs as they are presented as ordinary html files
// loaded over http(s) but really aren't and thus content scripts aren't
// allowed, see also Bug 1454760
function getUrlFiletype(url) {
  if (url.indexOf("/") > -1) {
    url = url.split("/").pop();
  }
  if (url.indexOf("?") > -1) {
    url = url.split("?")[0];
  }
  if (url.indexOf(".") > -1) {
    url = url.split(".").pop();
  }
  if (url.indexOf("#") > -1) {
    url = url.split("#")[0];
  }
  return url.toUpperCase();
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

// Parse through all bookmarks in tree.
// "n" adds 1 for each bookmark in node. If all bookmarks have been created,
// call on createMultiOption
function listBookmarksInTree(bookmarkItem, rootFolderId) {
  populateContextMenu(bookmarkItem.id, bookmarkItem.title, bookmarkItem.url, bookmarkItem.parentId, bookmarkItem.type, rootFolderId);

  if (bookmarkItem.children) {
    let n = 0;
    for (child of bookmarkItem.children) {
      listBookmarksInTree(child, rootFolderId);
      n ++;
    }
    if (n = bookmarkItem.children.length) {
      createMultiOption(bookmarkItem.id);
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

function makeFavicon(url, showFavicons) {
  if (showFavicons) {
    let faviconUrl = "";

    if (url == "FOLDER") {
      faviconUrl = "icons/folder.svg"
    }
    else if (url.indexOf("://") > -1) {
      faviconUrl = "https://www.google.com/s2/favicons?domain=" + getUrlProtocol(url) + "://" + getUrlHostname(url);
    }
    return {16: faviconUrl};
  }
  else {
    return undefined;
  }
}

// Show a "Getting Started" link in the context menu if not set up properly
function createHelpLink() {
  browser.menus.create({
    id: HELP_LINK,
    title: "Context Search – " + browser.i18n.getMessage("help_linkText"),
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
      title: browser.i18n.getMessage("menu_rootLabelText", "%s"),
      contexts: getAllowedContexts()
    }, onSuccess());
  }
  else {

    if (!url) {
      // These are the folders
      browser.menus.create({
        parentId: parent,
        id: id,
        title: encodeAmpersand(title),
        icons: makeFavicon("FOLDER", showFavicons)
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
          title: encodeAmpersand(title),
          icons: makeFavicon(url, showFavicons),
          enabled: checkValid(url),
          onclick: createTab
        }, onSuccess());
      }
    }

  }
}

// Create a separator and a new option to open all bookmarks at once for all folders
function createMultiOption(folderId) {
  if (showMultiOption) {
    browser.menus.create({
      parentId: folderId,
      type: "separator"
    });
    browser.menus.create({
      parentId: folderId,
      id: "folder" + folderId,
      title: browser.i18n.getMessage("menu_openMulti"),
      onclick: createMultiTab
    });
  }
}

function createMultiTab(info, parentTab) {
  let parentDir = info.parentMenuItemId;

  if (query == "%s" || fallbackMode) {
    query = info.selectionText;
  }

  let gettingSubTree = browser.bookmarks.getSubTree(parentDir);
  gettingSubTree.then((bookmarkItems) => {
    for (child of bookmarkItems[0].children) {
      if (child.type == "bookmark" && checkValid(child.url)) {
        let url = child.url.replace("%s", encodeURIComponent(query));
        goTo(url, parentTab.id, false, true);
      }
    }
  });
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

  // Check which mouse button was clicked and if any modifier keys was held down.
  // button 0 = left, 1 = middle, 2 = right.
  // This code tries to mimic the default behaviors as seen on http://mzl.la/1xKrRYF

  let mouseButton = info.button;
  let modifiers = info.modifiers;

  let invertNewCurrentTab = false;
  let invertForegroundBackgroundTab = false;

  if (mouseButton == 1) {
    invertNewCurrentTab = true;
  }

  if (os = "mac") {
    if (modifiers.includes("Command")) {
      invertNewCurrentTab = true;
    }
  else
    if (modifiers.includes("Ctrl")) {
      invertNewCurrentTab = true;
    }
  }

  if (modifiers.includes("Shift")) {
    invertForegroundBackgroundTab = true;
  }

  // Check options if tab should open as active or in background
  // Replace the browser standard %s for keyword searches with
  // the selected text on the page and make a tab
  let gettingItem = browser.storage.local.get();
  gettingItem.then((response) => {

    // Get default user settings, if none set, use for default behavior
    let openInNewTab = response.openInNewTab;
    let makeTabActive = response.makeTabActive;

    if (openInNewTab == undefined) {
      openInNewTab = true;
    }
    if (makeTabActive == undefined) {
      makeTabActive = true;
    }

    // If modifiers or alternative mouse button clicked, invert settings temporarily
    if (invertNewCurrentTab) {
      openInNewTab = !openInNewTab;
    }

    if (invertForegroundBackgroundTab) {
      makeTabActive = !makeTabActive;
    }

    goTo(url, parentTab.id, makeTabActive, openInNewTab);
  });
}

function goTo(url, openerTabId, active, openInNewTab) {
  if (openInNewTab) {
    // Using openerTabId makes new tabs open as expected. If in a window with
    // toolbars hidden, trying to set an openerTabId will throw an error.
    // If an error is thrown, the new tab is created without openerTabId.
    // For usability reasons the new tab will always get active.
    let creatingTab = browser.tabs.create({
      url: url,
      active: active,
      openerTabId: openerTabId
    });
    creatingTab.catch((e) => {
      browser.tabs.create({
        url: url,
        active: true
      })
    });
  }
  else {
    browser.tabs.update({
      url: url
    });
  }
}

// Rebuild the entire menu.
// In certain cases, like creating a new folder in the "Searches" folder,
// this function is called twice in short time (once for onCreated and once for onMoved).
// If main() isn't done before this function is called again, weird stuff happen.
// Therefore, this function isn't allowed to run again for 1000 ms.
function rebuildMenu() {
  if (!menuRebuilt) {
    menuRebuilt = true;
    browser.menus.remove(rootFolderId);
    browser.menus.remove(HELP_LINK);
    browser.menus.refresh();
    main();
  }
  resetMenuRebuilt();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function resetMenuRebuilt() {
  await sleep(1000);
  menuRebuilt = false;
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
        title: browser.i18n.getMessage("menu_rootLabelImage")
      });
      browser.menus.refresh();
    }
    else {
      browser.menus.update(rootFolderId, {
        title: browser.i18n.getMessage("menu_rootLabelText", encodeAmpersand(truncate(query)))
      });
      browser.menus.refresh();
    }
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
  getOptions();
});

browser.tabs.onUpdated.addListener(function(tabId, changeInfo, tabInfo) {
  // Only run this code on the active tab.
  if (changeInfo.status == "loading" && tabId == activeTabId) {
    parseTabUrl(tabId);
    getOptions();
  }
});

// Recieve messages from query.js
browser.runtime.onMessage.addListener(handleQuery);

// Parse platform info, used for modifier keys
browser.runtime.getPlatformInfo().then(parsePlatformInfo);

main();
