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
  let active = 0;

  // This is text selection, priority 1
  if (selection) {
    query = sanitize(selection);
  }

  // This is image URLs, priority 2
  if (!query && clickedElem.tagName === "IMG") {
    query = sanitize(clickedElem.src);
  }

  // This is link text, priority 3
  if (!query && activeElem.tagName === "A") {
    query = sanitize(clickedElem.textContent);
  }

  // Determine whether context menu should be shown
  if (query.length > 0) {
    active = 1;
  }

  browser.runtime.sendMessage({
    active: active,
    query: query
  });
}

document.addEventListener("contextmenu", makeQuery);
