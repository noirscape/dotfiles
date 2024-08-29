// ==UserScript==
// @name         Sigma-9 preserver
// @description  Prevent SCPs "Sigma-9" from being overwritten by author-submitted CSS styles.
// @version      2
// @grant        none
// @include      https://scp-wiki.wikidot.com/*
// @author       noirscape <nope at nope dot com> (https://noirscape.dev)
// @homepageURL  https://github.com/noirscape/dotfiles
// ==/UserScript==

document.querySelectorAll("style:not([id])").forEach(a => a.remove());
