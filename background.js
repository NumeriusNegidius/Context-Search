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
//  console.log("Root: " + subTreeID);

  listBookmarksInTree(bookmarkItems[0], subTreeID);
}

// Parse through all bookmarks in tree and fire populateContextMenu for each:
function listBookmarksInTree(bookmarkItem, subTreeID) {
//  console.log("ID: " + bookmarkItem.id + ". Title: " + bookmarkItem.title + ". Parent: " + bookmarkItem.parentId + ". STID: " + subTreeID);
  populateContextMenu(bookmarkItem.id, bookmarkItem.title, bookmarkItem.url, bookmarkItem.parentId, subTreeID);

  if (bookmarkItem.children) {
    for (child of bookmarkItem.children) {
      listBookmarksInTree(child, subTreeID);
    }
  }
}

// Make the context menu
function populateContextMenu(id, title, url, parent, subTreeID) {

  //Parse everything except root folder
  if (id != subTreeID) {

    // These are the folders
    if (!url) {
//      console.log("Make folder: " + id)
      browser.contextMenus.create({
        id: id,
        title: title,
        contexts: ["selection"]
      }, onCreated());
    }
    else {

      // These are the bookmarks in subfolders
      if (parent != subTreeID) {
//        console.log("Make link: " + id + ". P: " + parent + ". STID: " + subTreeID)
        browser.contextMenus.create({
          parentId: parent,
          id: url,
          title: title,
          contexts: ["selection"],
          onclick: goTo
        }, onCreated());
      }
      // These are the bookmarks in the root folder
      else {
//        console.log("Make link: " + id + ". P: " + parent + ". STID: " + subTreeID)
        browser.contextMenus.create({
          id: url,
          title: title,
          contexts: ["selection"],
          onclick: goTo
        }, onCreated());
      }

    }
  }
}

// replace the browser standard %s for keyword searches with
// the selected text on the page and go to url
function goTo(info) {
//  console.log("Selection " + info.selectionText + " and URL " + info.menuItemId);
  browser.tabs.create({
    url: info.menuItemId.replace("%s", encodeURIComponent(info.selectionText))
  });
}
