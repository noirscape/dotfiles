// ==UserScript==
// @name     Thirtyfour Danbooru Support script
// @version  3
// @match    *://*.rule34.xxx/*id=*
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

function makeR34ImageRequest(url) {
    return new Promise((resolve, reject) => {
        GM.xmlHttpRequest({
            method: "GET",
            url: url,
            responseType: "blob",
            headers: {
              "User-Agent": navigator.userAgent,
              "Accept": "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
              "Connection": "keep-alive",
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

function uploadImageToBooruRequest(image) {
    let form = new FormData();
    console.log(image["response"]);
    form.append(`upload[files][0]`, image["response"], `file.${mapContentTypeToExtension(image["content-type"])}`);
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

function getR34APIURL() {
    if (!window.location.search.includes("id=")) {
        throw new Error("Post ID not found in URL");
    }
    let post_id = window.location.search.match(/id=(\d+)/)[1];
    return "https://api.rule34.xxx/index.php?page=dapi&s=post&id=" + post_id + "&q=index&json=1" + gmcfg.get('r34APIString');
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
      "r34APIString": {
          'label': 'R34 API String',
          'type': 'text',
          'default': '',
      }
  },
});
GM.registerMenuCommand('Open R34 Support script settings', OpenConfig);
GM.registerMenuCommand('Upload to Booru', UploadToBooru);

function OpenConfig() {
  gmcfg.open();
}

async function UploadToBooru() {
  setPageHTMLToSpinner();
  try {
    setSpinnerText("Fetching R34 API data...");
    let apiInfo = await makeRequest(getR34APIURL());
    console.log(apiInfo);
    let imageURL = apiInfo[0]["file_url"];
    let tags = apiInfo[0]["tags"];
    let source = apiInfo[0]["source"];
  
    console.log(imageURL);
    setSpinnerText(`Fetching image from R34...`);
    let image = await makeR34ImageRequest(imageURL);
    console.log(image);
    setSpinnerText("Uploading image to Booru...");
    let resp = await uploadImageToBooruRequest(image);
    console.log(resp);
    window.location = `${gmcfg.get('booruDomain')}/uploads/${resp["id"]}?post[source]=${source}&post[tag_string]=${tags}`;  
  } catch (err) {
    console.error(err);
    setSpinnerText("An error of type " + err.name + " occurred: " + err.message);
  }
}
