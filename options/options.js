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

document.addEventListener('DOMContentLoaded', getOptions);
document.querySelector("#makeTabActive").addEventListener("change", saveOptions);
