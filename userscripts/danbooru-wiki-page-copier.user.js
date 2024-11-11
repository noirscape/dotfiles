// ==UserScript==
// @name         Danbooru support script (wiki pages)
// @version      10
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
          'default': 'https://danbooru.donmai.us/',
      },
      "burTopic": {
          'label': 'BUR Topic (0 to not use)',
          'type': 'integer',
          'default': 0,
      },
  }
});
gmcfg.init();

function getSlashNode() {
  var slashNode = document.createElement('span');
  slashNode.innerHTML = '/';
  return slashNode;
}

document.getElementById("page-footer").appendChild(getSlashNode());
var aNode = document.createElement('a');
aNode.innerHTML = 'Clone page';
aNode.setAttribute('id', 'wikicloner');
document.getElementById("page-footer").appendChild(aNode);
document.getElementById("wikicloner").addEventListener(
  "click", CreateBooruPage, false
);

document.getElementById("page-footer").appendChild(getSlashNode());
var aNode = document.createElement('a');
aNode.innerHTML = 'Clone BUR';
aNode.setAttribute('id', 'burcloner');
document.getElementById("page-footer").appendChild(aNode);
document.getElementById("burcloner").addEventListener(
  "click", CreateBURPage, false
);


var configNode = document.createElement('a');
configNode.innerHTML = '⚙️';
configNode.setAttribute('id', 'wikicloner-config');
document.getElementById("page-footer").appendChild(configNode);
document.getElementById("wikicloner-config").addEventListener(
  "click", OpenConfig, false
);


function OpenConfig(aEvent) {
  gmcfg.open();
}


// request helper function
function makeRequest(url) {
  return new Promise((resolve, reject) => {
      console.log(url);
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

// CREATE BOORU FUNCTION
async function createBooruPageTask() {
  // This function returns the destination url for a booru page to clone; if it's a new page it gives you that page, if it exists, it redirects to that page with an edit :) .
  let documentURL = new URL(document.URL);
  documentURL.search = '';
  let JSONpageURL = documentURL.href + '.json';

  let jdata = await makeRequest(JSONpageURL);

  let failed = false;
  let destData;
  try {
      destData = await makeRequest(`${gmcfg.get('booruDomain')}/wiki_pages/${jdata.title}.json`);
  } catch (err) {
      failed = true;
  }

  let url;
  if (!destData || failed) {
      url = new URL(`${gmcfg.get('booruDomain')}/wiki_pages/new`);
      url.search = new URLSearchParams({
          'wiki_page[title]': jdata.title,
          'wiki_page[body]': jdata.body,
          'wiki_page[other_names_string]': jdata.other_names.join(' ')
      });
  } else {
      url = new URL(`${gmcfg.get('booruDomain')}/wiki_pages/${destData.id}/edit`);
      url.search = new URLSearchParams({
          'wiki_page[title]': jdata.title,
          'wiki_page[body]': 'bogus',
          'wiki_page[other_names_string]': jdata.other_names.join(' ')
      });
      // search parms will have to be filled by a receiving userscript.
  }

  return url;
}

function CreateBooruPage(aEvent) {
  createBooruPageTask().then(destURL => {
      window.location = destURL;
  });
}

// BUR FUNCTIONALITY


async function parseBURfromTag(tagName, currentDomain, destinationDomain) {
  // This function constructs all the BUR info to port a BUR from one end to another.

  // A BUR consists of the following actions:
  // - aliases
  // - implications
  // - categories

  // In addition, the booru checks to prevent a BUR from being ran twice; the script prechecks if a BUR should exist.
  burStrings = []

  // alias code
  let aliasData = await makeRequest(`https://${currentDomain}/tag_aliases.json?search[consequent_name]=${tagName}`);
  let destinationAliases = await makeRequest(`https://${destinationDomain}/tag_aliases.json?search[consequent_name]=${tagName}`);

  // required upfront check: the tag needs to exist.
  console.log(`https://${destinationDomain}/tags.json?search[name]=${tagName}`);
  let existenceData = await makeRequest(`https://${destinationDomain}/tags.json?search[name]=${tagName}`);
  if (existenceData.length == 0 || existenceData.some(tag => tag.post_count == 0)) {
      // if the tag doesn't exist (either the destination doesn't know about it or has a post count of zero), then we return nothing.
      return "";
  }

  for (const alias of aliasData) {
      if (alias.status == 'deleted') {
          continue;
      }

      let aliasExists = destinationAliases.some(alias => alias.consequent_name == alias.consequent_name);
      if (!aliasExists) {
          burStrings.push(`alias ${alias.antecedent_name} -> ${alias.consequent_name}`);
      };
  }

  // implication code
  let implicationData = await makeRequest(`https://${currentDomain}/tag_implications.json?search[antecedent_name]=${tagName}`);
  let destinationImplications = await makeRequest(`https://${destinationDomain}/tag_implications.json?search[antecedent_name]=${tagName}`);

  for (const implication of implicationData) {
      if (implication.is_deprecated == true) {
          continue;
      }

      let implicationExists = destinationImplications.some(implication => implication.antecedent_name == implication.antecedent_name);
      if (!implicationExists) {
          burStrings.push(`imply ${implication.antecedent_name} -> ${implication.consequent_name}`);
      };
  }

  // category code
  let tagData = await makeRequest(`https://${currentDomain}/tags.json?search[name]=${tagName}`);
  for (const tag of tagData) {
      let category = null;
      switch (tag.category) {
          case 0:
              category = null;
              break;
          case 1:
              category = "artist";
              break;
          case 3:
              category = "copyright";
              break;
          case 4:
              category = "character";
              break;
          case 5:
              category = "meta";
              break;
      }
      if (category != null) {
          burStrings.push(`category ${tag.name} -> ${category}`);
      }
  }

  return burStrings.join("\n");
}

function CreateBURPage(aEvent) {
  let windowURL = new URL(window.location)
  const tagName = windowURL.pathname.split('/').pop().split('?')[0];
  const currentDomain = windowURL.hostname;
  const destinationDomain = new URL(gmcfg.get('booruDomain')).hostname;

  parseBURfromTag(tagName, currentDomain, destinationDomain).then(burString => {
      if (burString) {
          var url = new URL(`${gmcfg.get('booruDomain')}/bulk_update_requests/new`);
          url.search = new URLSearchParams({
              'bulk_update_request[forum_topic_id]': gmcfg.get('burTopic'),
              'bulk_update_request[script]': burString,
              'bulk_update_request[reason]': `Automated BUR creation through userscript based on page: [[${tagName}]]`
          });
          window.location = url.toString();
          console.log(url.toString());
      } else {
          alert("No BUR for this page needed :)");
      }
  });
}