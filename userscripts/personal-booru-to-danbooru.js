// ==UserScript==
// @name	 Personal support script (wiki pages)
// @version  2
// @match    *://INSERT_DOMAIN/wiki_pages/*
// @grant    none
// ==/UserScript==

// This userscript is not designed to be generally installed (hence the lack of a .user.js).
// If you want to use this on your own danbooru instance, replace INSERT_DOMAIN with the domain name in both the grant and the text below
// when making your own userscript.

function getSlashNode() {
    var slashNode = document.createElement('span');
    slashNode.innerHTML = '/';
    return slashNode;
}

document.getElementById("page-footer").appendChild(getSlashNode());
var aNode = document.createElement('a');
aNode.innerHTML = 'Wiki on Danbooru';
aNode.setAttribute('href', window.location.toString().replace('dbooru.noirscape.dev', 'danbooru.donmai.us'));
document.getElementById("page-footer").appendChild(aNode);

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