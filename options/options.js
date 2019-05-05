let eOpenInNewTab = document.getElementById("openInNewTab");
let eMakeTabActive = document.getElementById("makeTabActive");
let eOpenInCurrentTab = document.getElementById("openInCurrentTab");

function getOptions() {
  let gettingOptions = browser.storage.local.get();

  gettingOptions.then((response) => {
    if (response.openInNewTab == false) {
      eOpenInCurrentTab.checked = true;
      eMakeTabActive.checked = false;
    }
    else {
      eOpenInNewTab.checked = true;

      if (response.makeTabActive == false) {
        eMakeTabActive.checked = false;
      }
      else {
        eMakeTabActive.checked = true;
      }
    }
    setInfo();
  });
}

function setInfo() {
  let eShowForOpenInCurrentTab = document.getElementById("showForOpenInCurrentTab");
  let eShowForOpenInNewTab = document.getElementById("showForOpenInNewTab");

  if (eOpenInCurrentTab.checked) {
    eShowForOpenInCurrentTab.style.display = "block";
    eShowForOpenInNewTab.style.display = "none";
  }
  else {
    eShowForOpenInCurrentTab.style.display = "none";
    eShowForOpenInNewTab.style.display = "block";
  }
}

document.addEventListener("click", function(e) {
  if (e.target.tagName == "INPUT") {
    setInfo();

    if (eOpenInCurrentTab.checked) {
      eMakeTabActive.disabled = true;
      eMakeTabActive.checked = false;
      eMakeTabActive.nextElementSibling.classList.add("disabled");
    }
    else {
      eMakeTabActive.disabled = false;
      eMakeTabActive.nextElementSibling.classList.remove("disabled");
    }

    if (eOpenInNewTab.checked) {
      openInNewTab = true;
    }
    else {
      openInNewTab = false;
    }

    if (eMakeTabActive.checked) {
      makeTabActive = true;
    }
    else {
      makeTabActive = false;
    }

    browser.storage.local.set({
      openInNewTab: openInNewTab,
      makeTabActive: makeTabActive
    });
  }
}, false);

// showForOpenInNewTab
// showForOpenInCurrentTab
// showForMakeTabActive
// showForNotMakeTabActive

document.addEventListener("DOMContentLoaded", getOptions);
