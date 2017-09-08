// Define root folder for searches
const FOLDER_NAME = "Searches"
const ILLEGAL_PROTOCOLS = ["chrome", "javascript", "data", "file", "about"]

// Error logging
function onCreated(n) {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}

// Get ID of FOLDER_NAME and the object and pass everything through parseSubTree:
function main() {
  var gettingRootFolder = browser.bookmarks.search({title: FOLDER_NAME});
  gettingRootFolder.then((bookmarks) => {
    subTreeID = bookmarks[0].id;

    var gettingSubTree = browser.bookmarks.getSubTree(subTreeID);
    gettingSubTree.then(parseSubTree, onError);
  });
}

function parseSubTree(bookmarkItems) {
  var subTreeID = bookmarkItems[0].id;

  listBookmarksInTree(bookmarkItems[0], subTreeID);
}

function reGenerateList() {
  var removingContextMenu = browser.contextMenus.removeAll();
  removingContextMenu.then(main);
}

// Parse through all bookmarks in tree and fire populateContextMenu for each:
function listBookmarksInTree(bookmarkItem, subTreeID) {
  populateContextMenu(bookmarkItem.id, bookmarkItem.title, bookmarkItem.url, bookmarkItem.parentId, subTreeID);

  if (bookmarkItem.children) {
    for (child of bookmarkItem.children) {
      listBookmarksInTree(child, subTreeID);
    }
  }
}

function checkValid(url) {
  var isValidProtocol = false;
  var isValidWildcard = false;
  var isValid = false;

  // Check that URL is not privileged according to
  // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/create
  if (url.indexOf(":") > -1) {
      protocol = url.split(":")[0]
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
    console.log("Warning: " + url + " is non-conforming. URL is either missing \"%s\" or has an illegal protocol.")
  }

  return isValid;
}

// Make the context menu
function populateContextMenu(id, title, url, parent, subTreeID) {

  //This is the root folder, make the title what is searched for
  if (id == subTreeID) {
    browser.contextMenus.create({
      id: subTreeID,
      title: "Search for: %s",
      contexts: ["selection"]
    }, onCreated());
  }
  else {

    if (!url) {
      // These are the folders
      browser.contextMenus.create({
        parentId: parent,
        id: id,
        title: title
      }, onCreated());
    }

    else {
      var enabled = checkValid(url);

      // These are the bookmarks
      browser.contextMenus.create({
        parentId: parent,
        id: url,
        title: title,
        enabled: enabled,
        onclick: goTo
      }, onCreated());
    }

  }
}

// Check options if tab should open as active or in background
// Then pass to createTab
function goTo(info, parentTab) {
  var gettingItem = browser.storage.local.get("makeNewTabActive");
  gettingItem.then((settingTabIsActive) => {
    if (settingTabIsActive.makeNewTabActive == "false") {
      active = false;
    }
    else {
      active = true;
    }
    createTab(info, active, parentTab.index+1);
  });
}

// Replace the browser standard %s for keyword searches with
// the selected text on the page and make a tab
function createTab(info, active, index) {
  browser.tabs.create({
    url: info.menuItemId.replace("%s", encodeURIComponent(info.selectionText)),
    active: active,
    index: index
  });
}

browser.bookmarks.onCreated.addListener(reGenerateList);
browser.bookmarks.onRemoved.addListener(reGenerateList);
browser.bookmarks.onChanged.addListener(reGenerateList);
browser.bookmarks.onMoved.addListener(reGenerateList);

main();
