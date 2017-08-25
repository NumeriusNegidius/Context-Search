function saveOptions(e) {
  if (document.querySelector("#makeNewTabActive").checked) {
		makeNewTabActive = "true"
	}
	else {
		makeNewTabActive = "false"
	}
  browser.storage.local.set({
		makeNewTabActive: makeNewTabActive
  });
  e.preventDefault();
}

function getOptions() {
  var gettingItem = browser.storage.local.get("makeNewTabActive");
  gettingItem.then((res) => {
		if (res.makeNewTabActive == "false") {
			document.querySelector("#makeNewTabActive").checked = false;
		}
		else {
			document.querySelector("#makeNewTabActive").checked = true;
		}
  });
}

document.addEventListener('DOMContentLoaded', getOptions);
document.querySelector("#makeNewTabActive").addEventListener("change", saveOptions);
