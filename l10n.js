function localize() {
  let getNode = document.getElementsByClassName("l10n");
  for (let i = 0; i < getNode.length; i++) {
    let node = getNode[i];
    let msg = node.textContent;
    node.firstChild.nodeValue = browser.i18n.getMessage(msg);
  }
}


document.addEventListener("DOMContentLoaded", function() {
  localize();
});
