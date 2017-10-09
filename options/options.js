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

document.addEventListener('DOMContentLoaded', getOptions);
document.querySelector("#makeNewTabActive").addEventListener("change", saveOptions);
document.querySelector("#tabPlacement").addEventListener("change", saveOptions);
