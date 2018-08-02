const FILE_READER = new FileReader();


function main1() {
  let gettingRootFolder = browser.bookmarks.search({title: FOLDER_NAME});
  gettingRootFolder.then((bookmarks) => {
    if (bookmarks.length > 0) {
      rootFolderId = bookmarks[0].id;

      let gettingSubTree = browser.bookmarks.getSubTree(rootFolderId);
      gettingSubTree.then((bookmarkItems) => {
        listBookmarksInTree1(bookmarkItems[0], rootFolderId);
      });
    }
  });
}

function listBookmarksInTree1(bookmarkItem, rootFolderId) {
  if (bookmarkItem.url) {
    handleBookmarkUrl(bookmarkItem.url, bookmarkItem.id);
  }

  if (bookmarkItem.children) {
    for (child of bookmarkItem.children) {
      listBookmarksInTree1(child, rootFolderId);
    }
  }
}

var fetchInit = {
  method: "GET",
  credentials: "omit",
  mode: "cors",
  redirect: "follow",
  signal: null
};

function handleBookmarkUrl(url, nodeId) {
  console.log("Get favicon", nodeId, url);

  fetch(url, fetchInit)
  .then(function(response){
    console.log("status", response.status);

    response.text().then(function (text) {
      console.log("text", text);
    });

//    response.blob().then(function(blob) {
//      console.log("Contents: " + blob);
//      FILE_READER.readAsDataURL(blob);
//    });
  })
  .catch(function(err) {
      console.log(err);
    }
  );
}


//main1();

//handleBookmarkUrl("https://www.google.com", "XXX")
