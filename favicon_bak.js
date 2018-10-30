//const FILE_READER = new FileReader();

const FETCH_TIMEOUT = 10000; // Wait time in milliseconds for a fetch URL to complete

var faviconList = [];
var allBookmarksArray2 = [];
var allBookmarksQueue = [];
var currentDate = new Date().toISOString().substr(0,10);
var fetchTimerID = null;
var fetchController;

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


// Get the stored favicon list and start parsing all bookmarks
// These should be in 2 separate functions really, but I had difficulties retrieving the storage before starting parsing
//var getFaviconList = new Promise(function(resolve, reject) {
var getFaviconList = new Promise(function(resolve, reject) {
  let gettingFavicons = browser.storage.local.get();

  gettingFavicons.then((response) => {
    faviconList = response.faviconList;
    if (!faviconList) {
      faviconList = [];
    }
    resolve();
  });
});

function populateBookmarksArray() {
  let gettingRootFolder = browser.bookmarks.search({title: FOLDER_NAME});
  gettingRootFolder.then((bookmarks) => {
    if (bookmarks.length > 0) {
      rootFolderId = bookmarks[0].id;

      let gettingSubTree = browser.bookmarks.getSubTree(rootFolderId);
      gettingSubTree.then((bookmarkItems) => {
        parseSubTree(bookmarkItems[0], rootFolderId);
      });
    }
  });
}

function parseSubTree(bookmarkItem, rootFolderId) {
//  console.log(bookmarkItem.type);
  if (bookmarkItem.url) {
//    handleBookmarkUrl(bookmarkItem.url, bookmarkItem.id);
    allBookmarksArray2.push(bookmarkItem.id);
    console.log("PUSH", bookmarkItem.id);
  }

  if (bookmarkItem.children) {
    let countBookmarks = bookmarkItem.children.length;
    for (child of bookmarkItem.children) {
      parseSubTree(child, rootFolderId);
      countBookmarks--
      if (countBookmarks == 0) {
        console.log("WERE DONE HERE", allBookmarksArray2);
      }
      else {
//        console.log("PARSING", countBookmarks);
      }
    }
  }
}


// These are the arguments passed by fetch to the remote server
var fetchInit = {
  method: "GET",
  credentials: "omit",
  mode: "cors",
  redirect: "follow",
  signal: null
};


function handleBookmarkUrl(url, nodeId) {
//  let origin = getUrlProtocol(url) + "://" + getUrlHostname(url);
  console.log("GETTING FAVICON FOR", url);
  fetchController = new AbortController();
  fetchInit.signal = fetchController.signal;

  fetch(url, fetchInit)
  .then(function(response) {
    clearTimeout(fetchTimerID);
    fetchTimerID = null;

    if (response.status == 200) {
      console.log("OK! " + url + " STATUS", response.status);
    }
    else {
      console.log("NOT OK! " + url + " STATUS", response.status);
    }
//    response.text().then(function (text) {
//      console.log("text", text);
//    });

//    response.blob().then(function(blob) {
//      console.log("Contents: " + blob);
//      FILE_READER.readAsDataURL(blob);
//    });
  })
  .catch(function(err) {
    clearTimeout(fetchTimerID);
    fetchTimerID = null;
    console.log("ERROR", err, url);
  });

  fetchTimerID = setTimeout(fetchTimeoutHandler, FETCH_TIMEOUT);
}

//Function to handle a timeout on fetch() request: abort it
function fetchTimeoutHandler () {
  console.log("timeout");
  fetchTimerID = null;
  fetchController.abort();
}

//populateBookmarksArray();



getFaviconList
.then(function() {
  console.log("FIL", faviconList);
  populateBookmarksArray();
})
.then(function() {
  console.log("ABA", allBookmarksArray2);
});

//http://www.fakeresponse.com/api/?sleep=2
//handleBookmarkUrl("http://www.google.com", "XXX")
