// DEFINE FOLDER IN WHICH SEARCHABLE BOOKMARKS SHOULD BE LOCATED:
var folderName = "Searches"

// ERROR LOGGING:
function onCreated(n) {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}

// PARSE THROUGH ALL BOOKMARKS IN TREE AND MAKE FIRE populateContextMenu FOR EACH:
function listBookmarksInTree(bookmarkItem) {
  if (bookmarkItem.url) {
//    console.log(bookmarkItem.title + " - " + bookmarkItem.url);
    populateContextMenu(bookmarkItem.id, bookmarkItem.title, bookmarkItem.url);
  }
  if (bookmarkItem.children) {
    for (child of bookmarkItem.children) {
      listBookmarksInTree(child);
    }
  }
}

// DON'T KNOW WHAT IT DOES:
function logSubTree(bookmarkItems) {
  listBookmarksInTree(bookmarkItems[0], 0);
}

// GET ID OF folderName AND PASS THROUGH logSubTree:
var searching = browser.bookmarks.search({title: folderName});
searching.then((bookmarks) => {
  folderID = bookmarks[0];
//  console.log(folderID.id);

  var subTreeID = folderID.id;

  var gettingSubTree = browser.bookmarks.getSubTree(subTreeID);
  gettingSubTree.then(logSubTree, onError);
});

// MAKE THE CONTEXT MENU
function populateContextMenu(id, title, url) {
  browser.contextMenus.create({
    id: url,
    title: title,
    contexts: ["selection"],
    onclick: goTo
  }, onCreated());
}

// REPLACE THE BROWSER STANDARD %s FOR KEYWORD SEARCHES WITH
// THE SELECTED TEXT ON THE PAGE AND GO TO URL
function goTo(info) {
//  console.log("Selection " + info.selectionText + " and URL " + info.menuItemId);
  browser.tabs.create({
    url: info.menuItemId.replace("%s", encodeURIComponent(info.selectionText))
  });
}
