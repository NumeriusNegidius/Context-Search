// Define root folder for searches
const FOLDER_NAME = "Searches"

// Error logging
function onCreated(n) {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}

// Get ID of FOLDER_NAME and the object and pass everything through logSubTree:
var searching = browser.bookmarks.search({title: FOLDER_NAME});
searching.then((bookmarks) => {
  subTreeID = bookmarks[0].id;

  var gettingSubTree = browser.bookmarks.getSubTree(subTreeID);
  gettingSubTree.then(logSubTree, onError);
});

function logSubTree(bookmarkItems) {
  var subTreeID = bookmarkItems[0].id;

  listBookmarksInTree(bookmarkItems[0], subTreeID);
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
        title: title,
        contexts: ["selection"]
      }, onCreated());
    }

    else {
      // These are the bookmarks
      browser.contextMenus.create({
        parentId: parent,
        id: url,
        title: title,
        contexts: ["selection"],
        onclick: goTo
      }, onCreated());
    }

  }
}

// Check options if tab should open as active or in background
// Then pass to makeTab
function goTo(info) {
  var gettingItem = browser.storage.local.get("makeNewTabActive");
  gettingItem.then((res) => {
    if (res.makeNewTabActive == "false") {
      active = false;
    }
    else {
      active = true;
    }
    makeTab(info, active)
  });
}

// Replace the browser standard %s for keyword searches with
// the selected text on the page and make a tab
function makeTab(info, active) {
  browser.tabs.create({
    url: info.menuItemId.replace("%s", encodeURIComponent(info.selectionText)),
    active: active
  });
}
