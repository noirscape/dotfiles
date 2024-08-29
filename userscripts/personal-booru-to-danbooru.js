// ==UserScript==
// @name     View booru page on Danbooru
// @version  1
// @match    *://INSERT_DOMAIN/wiki_pages/*
// @grant    none
// ==/UserScript==

// This userscript is not designed to be generally installed (hence the lack of a .user.js).
// If you want to use this on your own danbooru instance, replace INSERT_DOMAIN with the domain name in both the grant and the text below
// when making your own userscript.

function getSlashNode() {
	var slashNode       = document.createElement('span');
	slashNode.innerHTML = '/';
  return slashNode;
}

document.getElementById("page-footer").appendChild(getSlashNode());
var aNode       = document.createElement ('a');
aNode.innerHTML = 'Wiki on Danbooru';
aNode.setAttribute ('href', window.location.toString().replace('INSERT_DOMAIN', 'danbooru.donmai.us'));
document.getElementById("page-footer").appendChild(aNode);
