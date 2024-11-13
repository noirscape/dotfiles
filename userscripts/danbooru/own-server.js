// ==UserScript==
// @name	 Personal support script (wiki pages)
// @version  5
// @match    *://INSERT_DOMAIN/wiki_pages/*
// @require  https://raw.githubusercontent.com/noirscape/dotfiles/refs/heads/master/userscripts/danbooru/common.js?v=5
// @grant    GM.xmlHttpRequest
// ==/UserScript==

// This userscript is not designed to be generally installed (hence the lack of a .user.js).
// If you want to use this on your own danbooru instance, replace INSERT_DOMAIN with the domain name in both the grant and the text below
// when making your own userscript.

// Footer logic
if (window.location.pathname.startsWith('/wiki_pages')) {
    document.getElementById("page-footer").appendChild(getSlashNode());
    var aNode = document.createElement('a');
    aNode.innerHTML = 'Wiki on Danbooru';
    aNode.setAttribute('href', window.location.toString().replace('dbooru.noirscape.dev', 'danbooru.donmai.us'));
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

    tags = post_json.tag_string.split(' ');
    let burString = '';
    for (let tag of tags) {
        tagBURString = await parseBURfromTag(tag, sourceDomain, destinationDomain);
        if (tagBURString) {
            burString += tagBURString;
            burString += '\n';
        }
    }

    return [burString, post_json];
}

function CreateBURPost(aEvent) {
    let windowURL = new URL(window.location);

    createBURfromPostPage().then(([burString, post_json]) => {
        if (burString) {
            var url = new URL(`https://${windowURL.hostname}/bulk_update_requests/new`);
            url.search = new URLSearchParams({
                'bulk_update_request[forum_topic_id]': '5',
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