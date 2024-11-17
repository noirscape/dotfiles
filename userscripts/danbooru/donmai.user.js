// ==UserScript==
// @name         Danbooru support script (2selfhosted)
// @version      14
// @match        *://danbooru.donmai.us/*
// @grant        GM.xmlHttpRequest
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @require      https://raw.githubusercontent.com/noirscape/dotfiles/refs/heads/master/userscripts/danbooru/common.js?v=14
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
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
          'default': '',
      },
      "burTopic": {
          'label': 'BUR Topic (0 to not use)',
          'type': 'integer',
          'default': 0,
      },
  },
  "events": {
      "init": onInit,
  }
});
GM.registerMenuCommand('Open support script settings', OpenConfig);

function onInit() {
    // Footer logic
    if (window.location.pathname.startsWith('/wiki_pages')) {
        addFooterLink('Clone page', 'wikicloner', CreateBooruPage);
        addFooterLink('Clone BUR', 'burcloner', CreateBURPage);
    }
}

function OpenConfig() {
  gmcfg.open();
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
          'wiki_page[body]': jdata.body,
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