// Define root folder for searches
const FOLDER_NAME = "Searches"
const ILLEGAL_PROTOCOLS = ["chrome", "javascript", "data", "file", "about"]

var browserVersion = 0;
var query = "";
var rootFolderID = "";

// Get browser version for backwards compatibility
function parseBrowserInfo(info){
  browserVersion = parseInt(info.version.split(".")[0]);
}

function getAllowedContexts() {
  if (browserVersion >=60) {
    return ["selection", "link", "image"];
  }
  else {
    return ["selection"];
  }
}

// Error logging
function onCreated(n) {
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

// Get ID of FOLDER_NAME and the object and pass everything through listBookmarksInTree:
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

        // No root folder found: Show "Getting Started" help link
        else {
          createHelpLink();
        }
      });
    }

    // No root folder found: Show "Getting Started" help link
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

function reGenerateList() {
  let removingContextMenu = browser.menus.removeAll();
  removingContextMenu.then(main);
}

function checkValid(url) {
  let isValidProtocol = false, isValidWildcard = false, isValid = false;

  // Check that URL is not privileged according to
  // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/create
  if (url.indexOf(":") > -1) {
      protocol = url.split(":")[0];
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
  var protocol, hostname, faviconUrl;

  if (url.indexOf("://") > -1) {
      protocol = url.substr(0, url.indexOf("://") + 3);
      hostname = url.split('/')[2];
  }

  faviconUrl = "https://www.google.com/s2/favicons?domain=" + protocol + hostname;

  return faviconUrl;
}


// Show a "Getting Started" link in the context menu if not set up properly
function createHelpLink() {
  browser.menus.create({
    id: "https://github.com/NumeriusNegidius/Context-Search/wiki",
    title: browser.i18n.getMessage("helpMenuLabel"),
    contexts: ["all"],
    onclick: createTab
  }, onCreated());
}

// Make the context menu
function populateContextMenu(id, title, url, parent, type, rootFolderID) {

  if (id == rootFolderID) {
    //This is the root folder, make the title what is searched for
    browser.menus.create({
      id: rootFolderID,
      title: browser.i18n.getMessage("rootMenuLabel", "%s"),
      contexts: getAllowedContexts()
    }, onCreated());
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
      }, onCreated());
    }

    else {
      if (type == "separator") {
        // These are the separators
        browser.menus.create({
          parentId: parent,
          id: id,
          type: "separator"
        }, onCreated());
      }

      if (url && title) {
        // These are the bookmarks
        let enabled = checkValid(url);
        let favicon = "";
        favicon = makeFavicon(url);
        browser.menus.create({
          parentId: parent,
          id: url,
          title: title,
          icons: {
            16: favicon
          },
          enabled: enabled,
          onclick: createTab
        }, onCreated());
      }
    }

  }
}

function checkBool(val) {
  if (typeof(val) === "boolean") {
    return val;
  }
  else {
    return false;
  }
}

function createTab(info, parentTab) {
  if (query == "%s") {
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

function handleQuery(response) {
  if (browserVersion >=60) {
    var debugMessage = "";

    query = response.query;
    elementType = response.elementType;
    debugMessage += elementType + ". " + query + ". ";

    if (!query && (elementType == "IMG" || elementType == "A")) {
      // Remove contextmenu when query is empty but
      // browser.menus will want to show it because of its contexts.
      // The menu must then be rebuilt to recieve future input
      browser.menus.remove(rootFolderID);
      browser.menus.refresh();
      main();

      debugMessage += "Rebuilt. "
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
    console.log(debugMessage);
  }
}

browser.bookmarks.onCreated.addListener(reGenerateList);
browser.bookmarks.onRemoved.addListener(reGenerateList);
browser.bookmarks.onChanged.addListener(reGenerateList);
browser.bookmarks.onMoved.addListener(reGenerateList);

browser.runtime.onMessage.addListener(handleQuery);
browser.runtime.getBrowserInfo().then(parseBrowserInfo);

main();
