// ==UserScript==
// @name     Pixiv Danbooru Support script
// @version  4
// @match    *://*.pixiv.net/*
// @grant    GM.xmlHttpRequest
// @require  https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @author       noirscape <nope at nope dot com> (https://noirscape.dev)
// @homepageURL  https://github.com/noirscape/dotfiles
// ==/UserScript==

function makeRequest(url) {
    console.log(url);
    return new Promise((resolve, reject) => {
        GM.xmlHttpRequest({
            method: "GET",
            url: url,
            responseType: "json",
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    resolve(response.response);
                } else {
                    reject(new Error(`Request failed with status ${response.status}`));
                }
            },
            onerror: function() {
                reject(new Error("Network Error"));
            }
        });
    });
}

function makePixivImageRequest(url) {
    return new Promise((resolve, reject) => {
        GM.xmlHttpRequest({
            method: "GET",
            url: url,
            responseType: "blob",
            headers: {
              "Referrer": "https://www.pixiv.net/",
              "User-Agent": navigator.userAgent,
              "Accept": "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
              "Accept-Language": "en-US,en;q=0.5",
              "Accept-Encoding": "gzip, deflate, br, zstd",
              "Connection": "keep-alive",
              "Referer": "https://www.pixiv.net/",
              "Sec-Fetch-Dest": "image",
              "Sec-Fetch-Mode": "no-cors",
							"Sec-Fetch-Site": "cross-site",
            },
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    resolve({"response": response.response, "content-type": response.contentType});
                } else {
                    reject(new Error(`Request failed with status ${response.status}`));
                }
            },
            onerror: function() {
                reject(new Error("Network Error"));
            }
        });
    });
}

function mapContentTypeToExtension(contentType) {
    switch (contentType) {
        case "image/jpeg":
            return "jpg";
        case "image/png":
            return "png";
        case "image/gif":
            return "gif";
        case "image/webp":
            return "webp";
        case "image/avif":
            return "avif";
        case "image/svg+xml":
            return "svg";
        default:
            return "jpg";
    }
}

function uploadImageToBooruRequest(images) {
    form = new FormData();
    for (const image_idx in images) {
      form.append(`upload[files][${image_idx}]`, images[image_idx]["response"], `file.${mapContentTypeToExtension(images[image_idx]["content-type"])}`);
    }
    form.append("upload[referer_url]", window.location);
    console.log(form);
    return new Promise((resolve, reject) => {
        GM.xmlHttpRequest({
            method: "POST",
            url: gmcfg.get('booruDomain') + '/uploads.json',
            headers: {
              "Authorization": btoa(gmcfg.get('booruUsername') + ":" + gmcfg.get('booruAPIKey')),
            },
            data: form,
            responseType: "json",
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    resolve(response.response);
                } else {
                    console.log(response.response);
                    reject(new Error(`Request failed with status ${response.status}`));
                }
            },
            onerror: function() {
                reject(new Error("Network Error"));
            }
        });
    });
}

function getPixivAPIURL() {
  if (window.location.pathname.includes("artworks")) {
    return "https://www.pixiv.net/ajax/illust/" + window.location.pathname.match(/artworks\/(\d+)/)[1] + "/pages";
  }
}


function setPageHTMLToSpinner() {
    let css_text = `.loader {
  border: 16px solid #f3f3f3; /* Light grey */
  border-top: 16px solid #3498db; /* Blue */
  border-radius: 50%;
  width: 120px;
  height: 120px;
  animation: spin 2s linear infinite;
}

.outer-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`
    let htmlText = `<div class="outer-center"><div class="loader"></div><span id="text-element"></span></div>`
    document.body.innerHTML = '<style>' + css_text + '</style>' + htmlText;
}

function setSpinnerText(text) {
    document.getElementById("text-element").innerText = text;
}

var gmcfg = new GM_config({
  "id": "PixivDanbooruSupport",
  "title": "Pixiv Danbooru Support Script",
  "fields": {
      "booruDomain": {
          'label': 'Booru Domain',
          'type': 'text',
          'default': '',
      },
      "booruUsername": {
          'label': 'Booru Username',
          'type': 'text',
          'default': '',
      },
      "booruAPIKey": {
          'label': 'Booru API Key',
          'type': 'text',
          'default': '',
      },
  },
});
GM.registerMenuCommand('Open Pixiv Support script settings', OpenConfig);
GM.registerMenuCommand('Upload to Booru', UploadToBooru);

function OpenConfig() {
  gmcfg.open();
}

async function UploadToBooru() {
  setPageHTMLToSpinner();
  try {
    setSpinnerText("Fetching Pixiv API data...");
    let apiInfo = await makeRequest(getPixivAPIURL());
    let imageURLs = apiInfo["body"].map(url => url["urls"]["original"]);
  
    let images = [];
    console.log(imageURLs);
    setSpinnerText("Fetching images from Pixiv...");
    for (const imageURL of imageURLs) {
      setSpinnerText(`Fetching image ${images.length + 1}/${imageURLs.length}`);
      let image = await makePixivImageRequest(imageURL);
      images.push(image);
    }
    console.log(images);
    setSpinnerText("Uploading images to Booru...");
    let resp = await uploadImageToBooruRequest(images);
    console.log(resp);
    window.location = `${gmcfg.get('booruDomain')}/uploads/${resp["id"]}?post[source]=${window.location}`;  
  } catch (err) {
    console.error(err);
    setSpinnerText("An error of type " + err.name + " occurred: " + err.message);
  }
}
