// ==UserScript==
// @name         Danbooru wiki page copier
// @version      4
// @match        *://danbooru.donmai.us/wiki_pages/*
// @grant        GM.xmlHttpRequest
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM.setValue
// @author       noirscape <nope at nope dot com> (https://noirscape.dev)
// @homepageURL  https://github.com/noirscape/dotfiles
// ==/UserScript==

var gmcfg = new GM_config({
  "id": "DanbooruWikiPageCopier",
	"title": "Danbooru wiki page copier",
  "fields": {
    "booruDomain": {
      'label': 'Booru Domain',
      'type': 'text',
      'default': 'https://danbooru.donmai.us/'
    },
  }
});
gmcfg.init();

function getSlashNode() {
	var slashNode       = document.createElement('span');
	slashNode.innerHTML = '/';
  return slashNode;
}

document.getElementById("page-footer").appendChild(getSlashNode());
var aNode       = document.createElement ('a');
aNode.innerHTML = 'Clone page';
aNode.setAttribute ('id', 'wikicloner');
document.getElementById("page-footer").appendChild(aNode);
document.getElementById ("wikicloner").addEventListener (
    "click", CreateBooruPage, false
);

var configNode  = document.createElement('a');
configNode.innerHTML = '⚙️';
configNode.setAttribute('id', 'wikicloner-config');
document.getElementById("page-footer").appendChild(configNode);
document.getElementById ("wikicloner-config").addEventListener (
    "click", OpenConfig, false
);


function OpenConfig(aEvent) {
  gmcfg.open();
}

function CreateBooruPage (aEvent) {
  	var JSONpageURL = document.URL + '.json'
    console.log(JSONpageURL);
    GM.xmlHttpRequest({"method": "GET",
                       "url": JSONpageURL,
                       "responseType": "json",
                       "onload": function(response) {
                          let jdata = response.response;
		          let destArgs = encodeURIComponent(`wiki_page[title]=${jdata.title}&wiki_page[body]=${jdata.body}&wiki_page[other_names_string]=${jdata.other_names.join(' ')})`
                          let destURL = `${gmcfg.get('booruDomain')}/wiki_pages/new?{destArgs}`;
                          window.location = destURL;
    			}}
	);
}

