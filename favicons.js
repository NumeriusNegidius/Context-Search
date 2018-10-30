let output = document.getElementById("output");
let del = document.getElementById("del");
let code = document.getElementById("code");
let gettingFavicons = browser.storage.local.get();

function getIcons() {
  gettingFavicons.then((response) => {
    faviconList = response.faviconList;
    if (faviconList) {
      code.textContent = JSON.stringify(faviconList);

      for (let item of faviconList) {
        let row = document.createElement("TR")
        output.appendChild(row);

        let bookmarkId = document.createElement("td");
        bookmarkId.textContent = item.id;
        row.appendChild(bookmarkId);

        let imgCol = document.createElement("td");
        row.appendChild(imgCol);

        let img = document.createElement("img");
        img.src = item.url;
        imgCol.appendChild(img);

        let url = document.createElement("td");
        url.textContent = item.url;
        row.appendChild(url);

        let dt = document.createElement("td");
        dt.textContent = item.dt;
        row.appendChild(dt);
      }
    }
  });
}

function deleteAll() {
  console.log("DELETED EVERYTHING!");
  browser.storage.local.remove("faviconList");
  location.reload();
}

del.addEventListener("click", deleteAll)
document.addEventListener("DOMContentLoaded", getIcons);
