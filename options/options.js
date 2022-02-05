let eOpenInNewTab = document.getElementById("openInNewTab");
let eOpenInBackground = document.getElementById("openInBackground");
let eOpenInCurrentTab = document.getElementById("openInCurrentTab");
let eShowMultiOption = document.getElementById("showMultiOption");
let eShowFavicons = document.getElementById("showFavicons");
let eEnableShortcuts = document.getElementById("enableShortcuts");
let eHelpLinkUrl = document.getElementById("helpLinkUrl")

function getOptions() {
  eHelpLinkUrl.href = "/_locales/" + browser.i18n.getMessage("help_locale") + "/help.html";

  let gettingOptions = browser.storage.local.get();

  gettingOptions.then((response) => {
    // Open in current tab...
    if (response.openInNewTab == false) {
      eOpenInCurrentTab.checked = true;
      eOpenInBackground.checked = false;
    }
    // ...or in a new tab (default behavior)
    else {
      eOpenInNewTab.checked = true;

      if (response.makeTabActive == false) {
        eOpenInBackground.checked = true;
      }
      else {
        eOpenInBackground.checked = false;
      }
    }
    // Don't show multiple searches at once...
    if (response.showMultiOption == false) {
      eShowMultiOption.checked = false;
    }
    // ...or do (default behavior)
    else {
      eShowMultiOption.checked = true;
    }

    // Don't show favicons...
    if (response.showFavicons == false) {
      eShowFavicons.checked = false;
    }
    // ...or do (default behavior)
    else {
      eShowFavicons.checked = true;
    }

    // Don't enable shortcuts...
    if (response.enableShortcuts == false) {
      eEnableShortcuts.checked = false;
    }
    // ...or do (default behavior)
    else {
      eEnableShortcuts.checked = true;
    }

    setInfo();
  });
}

function setInfo() {
  let eShowForOpenInCurrentTab = document.getElementById("showForOpenInCurrentTab");
  let eShowForOpenInNewTab = document.getElementById("showForOpenInNewTab");
  let eShowForOpenInForeground = document.getElementById("showForOpenInForeground");
  let eShowForOpenInBackground = document.getElementById("showForOpenInBackground");

  if (eOpenInCurrentTab.checked) {
    eShowForOpenInCurrentTab.style.display = "block";
    eShowForOpenInNewTab.style.display = "none";
    eShowForOpenInForeground.style.display = "none";
    eShowForOpenInBackground.style.display = "none";
  }
  else {
    eShowForOpenInCurrentTab.style.display = "none";
    eShowForOpenInNewTab.style.display = "block";

    if (eOpenInBackground.checked) {
      eShowForOpenInForeground.style.display = "none";
      eShowForOpenInBackground.style.display = "block";
    }
    else {
      eShowForOpenInForeground.style.display = "block";
      eShowForOpenInBackground.style.display = "none";
    }
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

    if (eShowMultiOption.checked) {
      showMultiOption = true;
    }
    else {
      showMultiOption = false;
    }

    if (eShowFavicons.checked) {
      showFavicons = true;
    }
    else {
      showFavicons = false;
    }

    if (eEnableShortcuts.checked) {
      enableShortcuts = true;
    }
    else {
      enableShortcuts = false;
    }

    browser.storage.local.set({
      openInNewTab: openInNewTab,
      makeTabActive: makeTabActive,
      showMultiOption: showMultiOption,
      showFavicons: showFavicons,
      enableShortcuts: enableShortcuts
    });
  }
}, false);

document.addEventListener("DOMContentLoaded", getOptions);
