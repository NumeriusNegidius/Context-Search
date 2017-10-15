function saveOptions(e) {
  tabPlacement = document.querySelector("#tabPlacement option:checked").id;

  if (document.querySelector("#makeNewTabActive").checked) {
    makeNewTabActive = "true";
  }
  else {
    makeNewTabActive = "false";
  }

  browser.storage.local.set({
    makeNewTabActive: makeNewTabActive,
    tabPlacement: tabPlacement
  });
  e.preventDefault();
}

function getOptions() {
  localize();
  let gettingOptions = browser.storage.local.get();

  gettingOptions.then((response) => {
    if (response.tabPlacement) {
      document.getElementById(response.tabPlacement).selected = true;
    }

    if (response.makeNewTabActive == "false") {
      document.getElementById("makeNewTabActive").checked = false;
    }
    else {
      document.getElementById("makeNewTabActive").checked = true;
    }
  });
}

function localize() {
  let getNode = document.getElementsByClassName("l10n");
  for (let i = 0; i < getNode.length; i++) {
    let node = getNode[i];
    let msg = node.innerHTML;
    node.innerHTML = browser.i18n.getMessage(msg);
  }
}

document.addEventListener('DOMContentLoaded', getOptions);
document.querySelector("#makeNewTabActive").addEventListener("change", saveOptions);
document.querySelector("#tabPlacement").addEventListener("change", saveOptions);
