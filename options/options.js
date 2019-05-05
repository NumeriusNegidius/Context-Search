let eOpenInNewTab = document.getElementById("openInNewTab");
let eOpenInBackground = document.getElementById("openInBackground");
let eOpenInCurrentTab = document.getElementById("openInCurrentTab");

function getOptions() {
  let gettingOptions = browser.storage.local.get();

  gettingOptions.then((response) => {
    if (response.openInNewTab == false) {
      eOpenInCurrentTab.checked = true;
      eOpenInBackground.checked = false;
    }
    else {
      eOpenInNewTab.checked = true;

      if (response.openInBackground == false) {
        eOpenInBackground.checked = false;
      }
      else {
        eOpenInBackground.checked = true;
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
      eOpenInBackground.disabled = true;
      eOpenInBackground.checked = false;
      eOpenInBackground.nextElementSibling.classList.add("disabled");
    }
    else {
      eOpenInBackground.disabled = false;
      eOpenInBackground.nextElementSibling.classList.remove("disabled");
    }

    if (eOpenInNewTab.checked) {
      openInNewTab = true;
    }
    else {
      openInNewTab = false;
    }

    if (eOpenInBackground.checked) {
      makeTabActive = false;
    }
    else {
      makeTabActive = true;
    }

    browser.storage.local.set({
      openInNewTab: openInNewTab,
      openInBackground: openInBackground
    });
  }
}, false);

document.addEventListener("DOMContentLoaded", getOptions);
