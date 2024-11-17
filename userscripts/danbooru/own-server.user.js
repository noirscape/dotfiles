// ==UserScript==
// @name	 Personal support script (2selfhosted)
// @version  8
// @require  https://raw.githubusercontent.com/noirscape/dotfiles/refs/heads/master/userscripts/danbooru/common.js?v=8
// @require  https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant    GM_getValue
// @grant    GM_setValue
// @grant    GM.getValue
// @grant    GM.setValue
// @grant    GM.xmlHttpRequest
// @grant    GM.registerMenuCommand
// ==/UserScript==

// This userscript is not designed to be generally installed. You need to add an @grant in your userscript manager 
// settings for the domain you're running it on.
var gmcfg = new GM_config({
    "id": "DanbooruWikiPageCopierClient",
    "title": "Danbooru support script (2selfhosted)",
    "fields": {
        "booruDomain": {
            'label': 'Upstream Domain',
            'type': 'text',
            'default': 'danbooru.donmai.us',
        },
        "burTopic": {
            'label': 'BUR Topic (0 to not use)',
            'type': 'integer',
            'default': 0,
        },
    }
});
gmcfg.init();
GM.registerMenuCommand('Open support script settings', OpenConfig);
  
// Footer logic
if (window.location.pathname.startsWith('/wiki_pages')) {
    document.getElementById("page-footer").appendChild(getSlashNode());
    var aNode = document.createElement('a');
    aNode.innerHTML = 'Wiki on Danbooru';
    aNode.setAttribute('href', window.location.toString().replace(window.location.hostname, gmcfg.get('booruDomain')));
    document.getElementById("page-footer").appendChild(aNode);
}

// Post page logic
if (/^\/posts\/\d+$/.test(window.location.pathname)) {
    let ulNode = setupPostToolbox();
    addPostToolboxLink(ulNode, 'burcloner', 'Create BUR for tags', CreateBURPost);
}

async function createBURfromPostPage() {
    let windowURL = new URL(window.location);
    windowURL.search = '';
    const sourceDomain = 'danbooru.donmai.us';
    const destinationDomain = windowURL.hostname;

    post_json = await makeRequest(windowURL.href + '.json');

    let tags = post_json.tag_string.split(' ');
    let burString = '';

    addPostToolboxProgressBar(document.getElementById('userscript').getElementsByTagName('li')[0], 'burprogress', 0, tags.length);
    idx = 0;
    for (let tag of tags) {
        let tagBURString = await parseBURfromTag(tag, sourceDomain, destinationDomain);
        if (tagBURString) {
            burString += tagBURString;
            burString += '\n';
        }
        updateProgressBar('burprogress', idx);
        idx++;
    }
    deleteProgressBar('burprogress');

    return [burString, post_json];
}

function CreateBURPost(aEvent) {
    let windowURL = new URL(window.location);

    createBURfromPostPage().then(([burString, post_json]) => {
        if (burString) {
            var url = new URL(`https://${windowURL.hostname}/bulk_update_requests/new`);
            url.search = new URLSearchParams({
                'bulk_update_request[forum_topic_id]': gmcfg.get('booruDomain'),
                'bulk_update_request[script]': burString,
                'bulk_update_request[reason]': `Automated BUR creation through userscript based on post:\n\n* !post #${post_json.id}`
            });
            window.location = url.toString();
            console.log(url.toString());
        } else {
            alert("No BURs for this post are needed :)");
        }
    })
};

// This is some receiver code for my wiki page copier.
function fillFieldFromGetParam(node_name, get_param_name) {
    let queryString = window.location.search;
    let urlParams = new URLSearchParams(queryString);

    let paramValue = urlParams.get(get_param_name);

    if (paramValue) {
        let wikiPageTitleNode = document.getElementById(node_name);
        wikiPageTitleNode.value = urlParams.get(get_param_name);
        return true;
    } else {
        return false;
    }
}

if (/^\/wiki_pages\/\d+\/edit$/.test(window.location.pathname)) {
    let titleFilled = fillFieldFromGetParam("wiki_page_title", "wiki_page[title]");
    let bodyFilled = fillFieldFromGetParam("wiki_page_body", "wiki_page[body]");
    let otherNamesFilled = fillFieldFromGetParam("wiki_page_other_names_string", "wiki_page[other_names_string]");
    if (titleFilled || bodyFilled || otherNamesFilled) {
        document.getElementById('wiki_page_is_deleted').checked = false;
    }
}