function localize() {
  let getNode = document.getElementsByClassName("l10n");
  for (let i = 0; i < getNode.length; i++) {
    let node = getNode[i];
    let msg = node.textContent;
    node.firstChild.nodeValue = browser.i18n.getMessage(msg);
  }
}

function parsePlatformInfo(info) {
  os = info.os;
  let modKey = browser.i18n.getMessage("modKeyWinLin");
  if (os = "mac") {
    modKey = browser.i18n.getMessage("modKeyMac");
  }

  let getNode = document.getElementsByClassName("modKey");
  for (let i = 0; i < getNode.length; i++) {
    let node = getNode[i];
    node.textContent = modKey;
  }
}

document.addEventListener("DOMContentLoaded", localize);
browser.runtime.getPlatformInfo().then(parsePlatformInfo);
