function saveOptions(e) {
  if (document.querySelector("#makeTabActive").checked) {
    makeTabActive = true;
  }
  else {
    makeTabActive = false;
  }

  browser.storage.local.set({
    makeTabActive: makeTabActive
  });
  e.preventDefault();
}

function getOptions() {
  localize();
  let gettingOptions = browser.storage.local.get();

  gettingOptions.then((response) => {
    if (response.makeTabActive == false) {
      document.getElementById("makeTabActive").checked = false;
    }
    else {
      document.getElementById("makeTabActive").checked = true;
    }
  });
}

function localize() {
  let getNode = document.getElementsByClassName("l10n");
  for (let i = 0; i < getNode.length; i++) {
    let node = getNode[i];
    let msg = node.textContent;
    node.firstChild.nodeValue = browser.i18n.getMessage(msg);
  }
}

document.addEventListener('DOMContentLoaded', getOptions);
document.querySelector("#makeTabActive").addEventListener("change", saveOptions);
