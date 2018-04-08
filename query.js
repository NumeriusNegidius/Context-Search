function sanitize(query) {
  query = query.replace(/<(.|\n)*?>/g, " "); // Remove persistent html tags
  query = query.replace(/\n\t/g, " "); // Replace newlines and tabs with spaces
  query = query.replace(/ +(?= )/g, ""); // Make all double spaces single
  query = query.trim();

  return query;
}

function makeQuery(info) {
  let query = "";
  let selection = window.getSelection().toString();
  let activeElem = document.activeElement;
  let clickedElem = info.target;
  let queryType = 0;

  // This is text selection, priority 1
  if (selection) {
    query = sanitize(selection);
    if (query.length > 0) {
      queryType = 1;
    }
  }

  // This is image URLs, priority 2
  if (!query && clickedElem.tagName === "IMG") {
    query = sanitize(clickedElem.src);
    if (query.length > 0) {
      queryType = 2;
    }
  }

  // This is link text, priority 3
  if (!query && activeElem.tagName === "A") {
    query = sanitize(clickedElem.textContent);
    if (query.length > 0) {
      queryType = 1;
    }
  }

  browser.runtime.sendMessage({
    queryType: queryType,
    query: query
  });
}

document.addEventListener("contextmenu", makeQuery);
