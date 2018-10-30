//const FILE_READER = new FileReader();

const DEFER_EXECUTION = 1000; // Wait time in ms before starting script
const PAUSE_BETWEEN_FETCHING = 2100; // Wait time in ms before starting script
const FETCH_TIMEOUT = 2000; // Wait time in ms for a fetch URL to complete

var allBookmarksQueue = [];
var currentDate = new Date().toISOString().substr(0,10);
var fetchTimerID = null;
var fetchController;

// These are the arguments passed by fetch to the remote server
var fetchInit = {
  method: "GET",
  credentials: "omit",
  mode: "cors",
  redirect: "follow",
  signal: null
};

// Async sleep function that resolves after n ms.
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// background.js populates and fetches faviconList and allBookmarksArray.
// Defer fetching favicons for some time to make sure those arrays are populated.
async function startFetching() {
  await sleep(DEFER_EXECUTION);
  allBookmarksQueue = allBookmarksArray;
  queueFetching();

//  console.log("ABA", allBookmarksArray);
//  console.log("FIL", faviconList);
//  console.log("WAITED", DEFER_EXECUTION);
}

function queueFetching() {
  if (allBookmarksQueue.length > 0) {
    let firstInLine = allBookmarksQueue[0];
    let getBookmark = browser.bookmarks.get(firstInLine);
    getBookmark.then((bookmark) => {
      if (bookmark[0]) {
        bookmarkUrl = bookmark[0].url;
        // HERE WE NEED TO LOOK UP IF BOOKMARK HAS FAVICON IN faviconList
        // BEFORE STEALING RESOURCES
        fetchThis(firstInLine, bookmarkUrl);
      }
    });
  }
}

// Remove first element from queue and rerun queueFetching
function deQueue() {
  allBookmarksQueue.shift();
  queueFetching();
}

async function fetchThis(bookmarkId, bookmarkUrl) {
//  console.log("DO STUFF WITH", bookmarkId, bookmarkUrl);
  handleBookmarkUrl(bookmarkId, bookmarkUrl);
  await sleep(PAUSE_BETWEEN_FETCHING);
  deQueue();
}

//Function to handle a timeout on fetch() request: abort it
function fetchTimeoutHandler() {
  console.log("FETCH TIMEOUT");
  fetchTimerID = null;
  fetchController.abort();
}

function handleBookmarkUrl(bookmarkId, bookmarkUrl) {
//  let origin = getUrlProtocol(bookmarkUrl) + "://" + getUrlHostname(bookmarkUrl);
//  console.log("GETTING FAVICON FOR", bookmarkUrl);

  bookmarkUrl = bookmarkUrl.replace("%s", "ping")
  bookmarkOrigin = getUrlProtocol(bookmarkUrl) + "://" + getUrlHostname(bookmarkUrl);

  fetchController = new AbortController();
  fetchInit.signal = fetchController.signal;

  fetch(bookmarkUrl, fetchInit)
  .then(function(response) {
    clearTimeout(fetchTimerID);
    fetchTimerID = null;

    if (response.status == 200) {
      console.log("OK! " + bookmarkUrl + " STATUS", response.status, response.statusText);
      response.text().then(function (text) {
        let lowerCaseText = text.toLowerCase();
        extractFavicon(lowerCaseText, bookmarkOrigin, 0);
      });
//    response.blob().then(function(blob) {
//      console.log("Contents: " + blob);
//      FILE_READER.readAsDataURL(blob);
//    });
    }
    else {
      // Perhaps we should not check for favicons on each boot on sites
      // that throw forbidden or other stuff. Let Firefox handle those on search
      // as per background.js.
      console.log("NOT OK! " + bookmarkUrl + " STATUS", response.status, response.statusText);
    }
  })
  .catch(function(err) {
    clearTimeout(fetchTimerID);
    fetchTimerID = null;
    console.log("ERROR", err, bookmarkUrl);
  });

  fetchTimerID = setTimeout(fetchTimeoutHandler, FETCH_TIMEOUT);
}

function extractFavicon(lowerCaseText, bookmarkOrigin, posStart) {
  let queryStart = "<link";
  let queryEnd = ">";
  let posQueryStart = lowerCaseText.indexOf(queryStart, posStart);
  let posQueryEnd = lowerCaseText.indexOf(queryEnd, posQueryStart) + 1;

  let queryTest = lowerCaseText.substring(posQueryStart, posQueryEnd);
  queryTest = queryTest.replace("\'", "\"")
//  console.log(posStart, posQueryStart, posQueryEnd, queryTest);

  let matchRel1 = "\"shortcut icon\"";
  let matchRel2 = "\"icon\"";

  if (posQueryStart > -1) {
    if (queryTest.indexOf(matchRel1) > -1 || queryTest.indexOf(matchRel2) > -1) {
      console.log("YES! @", posQueryStart, "-", posQueryEnd, queryTest);

      let hrefStart = " href";
      let posHrefStart = queryTest.indexOf(hrefStart);
      let extractUrlStart = queryTest.indexOf("\"", posHrefStart) + 1;
      let extractUrlEnd = queryTest.indexOf("\"", extractUrlStart);

      let extractedUrl = queryTest.substring(extractUrlStart, extractUrlEnd);

      if (extractedUrl.indexOf("http") != 0) {
        // If extractedUrl doesn't start with "http", we need to make it an
        // absolute url starting with the protocol.

        // If extractedUrl begins with //, we assume it's relative from protocol
        // and attach the protocol
        if (extractedUrl.indexOf("//") == 0) {
          extractedUrl = getUrlProtocol(bookmarkOrigin) + ":" + extractedUrl;
        }

        // If extractedUrl begins with /, we assume it's an absolute path from domain root
        // and attach the origin
        if (extractedUrl.indexOf("/") == 0) {
          extractedUrl = bookmarkOrigin + extractedUrl;
        }

        // If extractedUrl does not begin with /, we assume it's relative from current path
        // and attach origin and path
        if (extractedUrl.indexOf("/") != 0) {
          // THIS IS FAULTY!!!!!
          extractedUrl = bookmarkOrigin + "/" + extractedUrl;
        }

        // If extractedUrl begins with .., we need to remove the last catalog
//        if (extractedUrl.indexOf("..") == 0) {
//          extractedUrl = extractedUrl;
//        }

        // OK, so 2 problems.
        // * relative HREF:s could link to a favicon in a subfolder.
        //   Thus we cannot assume that the favicon is att origin/iconpath

      }


      console.log(extractUrlStart, extractUrlEnd, extractedUrl);

    }
    else {
//      console.log("Hmm! @", posQueryStart, "-", posQueryEnd, queryTest);
      extractFavicon(lowerCaseText, bookmarkOrigin, posQueryEnd);
    }
  }
}

//function xxx() {
//  queryTest = "<link rel=\"shortcut icon\" href=\"/themes/custom/client/favicon.ico\" type=\"image/vnd.microsoft.icon\" />"
//  queryTest = "<link rel=\"shortcut icon\" href=\"https://cdn.sstatic.net/Sites/stackoverflow/img/favicon.ico?v=4f32ecc8f43d\">"
//
//  let hrefStart = " href";
//  let posHrefStart = queryTest.indexOf(hrefStart);
//  let extractUrlStart = queryTest.indexOf("\"", posHrefStart) + 1;
//  let extractUrlEnd = queryTest.indexOf("\"", extractUrlStart);
//
//  let extractedUrl = queryTest.substring(extractUrlStart, extractUrlEnd);
//
//  console.log(extractUrlStart, extractUrlEnd, extractedUrl);
//
//}

//xxx();

//startFetching();

//http://www.fakeresponse.com/api/?sleep=2
handleBookmarkUrl("XXXX","https://www.fass.se")
