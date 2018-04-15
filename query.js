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
  let elementType = activeElem.tagName;

  // This is text selection, priority 1
  if (selection) {
    query = sanitize(selection);
  }

  // This is input text selection link text, priority 1
  if (!query && (activeElem.tagName === "TEXTAREA" || activeElem.tagName === "INPUT")) {
    query = sanitize(activeElem.value.substring(activeElem.selectionStart, activeElem.selectionEnd))
  }

  // This is image URLs, priority 2
  if (!query && clickedElem.tagName === "IMG") {
    query = sanitize(clickedElem.src);
    elementType = "IMG"
  }

  // This is link text, priority 3
  if (!query && activeElem.tagName === "A") {
    query = sanitize(clickedElem.textContent);
  }

  browser.runtime.sendMessage({
    query: query,
    elementType: elementType
  });
}

document.addEventListener("contextmenu", makeQuery);
