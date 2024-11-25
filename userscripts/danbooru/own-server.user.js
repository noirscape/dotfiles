// ==UserScript==
// @name	 Personal support script (2selfhosted)
// @version  10
// @require  https://raw.githubusercontent.com/noirscape/dotfiles/refs/heads/master/userscripts/danbooru/common.js?v=10
// @require  https://openuserjs.org/src/libs/sizzle/GM_config.js
// @match    *://userconfigured.invalid/*
// @grant    GM_getValue
// @grant    GM_setValue
// @grant    GM.getValue
// @grant    GM.setValue
// @grant    GM.listValues
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
    },
    "events": {
        "init": onInit,
    }
});

GM.registerMenuCommand('Open support script settings', OpenConfig);

function OpenConfig() {
    gmcfg.open();
}

function onInit() {
    // Footer logic
    if (window.location.pathname.startsWith('/wiki_pages')) {
        document.getElementById("page-footer").appendChild(getSlashNode());
        var aNode = document.createElement('a');
        aNode.innerHTML = 'Wiki on Danbooru';
        aNode.setAttribute('href', window.location.toString().replace(window.location.hostname, gmcfg.get('booruDomain')));
        document.getElementById("page-footer").appendChild(aNode);

        // add elements to submenu
        addSubNavSeparator();
        addSubNavLink('New BUR', 'new-tag-bur', 'Create a new BUR', OpenBURForPost);
    }

    // Post page logic
    if (/^\/posts\/\d+$/.test(window.location.pathname)) {
        let ulNode = setupPostToolbox();
        addPostToolboxLink(ulNode, 'burcloner', 'Create BUR for tags', CreateBURPost);
    }

    // Post list logic
    if (/^\/posts$/.test(window.location.pathname)) {
        let ulNode = setupPostToolbox();
        addPostToolboxLink(ulNode, 'burcloner', 'Create BUR for tags', CreateBURPostList);
    }
}

async function createBURfromPostPage() {
    let windowURL = new URL(window.location);
    windowURL.search = '';
    const sourceDomain = 'danbooru.donmai.us';
    const destinationDomain = windowURL.hostname;

    post_json = await makeRequest(windowURL.href + '.json');

    let tags = post_json.tag_string.split(' ');
    let burString = await parseBURfromTags(tags, sourceDomain, destinationDomain);

    return [burString, post_json];
}

async function createBURfromPostList() {
    let windowURL = new URL(window.location);
    windowURL.pathname = windowURL.pathname + '.json';
    const sourceDomain = 'danbooru.donmai.us';
    const destinationDomain = windowURL.hostname;

    post_json = await makeRequest(windowURL.href);

    let tags = { };
    for (const post of post_json) {
        split_tags = post.tag_string.split(' ');
        for (const tag of split_tags) {
            tags[tag] = true;
        }
    }

    console.log(tags);

    let burString = await parseBURfromTags(Object.keys(tags), sourceDomain, destinationDomain);
    return [burString, post_json];
}

function generatePostListGallery(post_json) {
    retString = '';
    for (const post of post_json) {
        retString += `* !post #${post.id}\n`;
    }
    return retString;
}

function CreateBURPostList(aEvent) {
    let windowURL = new URL(window.location);

    createBURfromPostList().then(([burString, post_json]) => {
        if (burString) {
            var url = new URL(`https://${windowURL.hostname}/bulk_update_requests/new`);
            url.search = new URLSearchParams({
                'bulk_update_request[forum_topic_id]': gmcfg.get('burTopic'),
                'bulk_update_request[script]': burString,
                'bulk_update_request[reason]': `Automated BUR creation through userscript based on post:\n\n${generatePostListGallery(post_json)}`,
            });
            window.location = url.toString();
            console.log(url.toString());
        } else {
            alert("No BURs for this post are needed :)");
        }
    })
}

function CreateBURPost(aEvent) {
    let windowURL = new URL(window.location);

    createBURfromPostPage().then(([burString, post_json]) => {
        if (burString) {
            var url = new URL(`https://${windowURL.hostname}/bulk_update_requests/new`);
            url.search = new URLSearchParams({
                'bulk_update_request[forum_topic_id]': gmcfg.get('burTopic'),
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
function fillFieldFromHashParam(node_name, get_param_name) {
    let queryString = window.location.hash.substring(1);;
    let urlParams = new URLSearchParams(queryString);
    console.log(urlParams);

    let paramValue = urlParams.get(get_param_name);

    if (paramValue) {
        let wikiPageTitleNode = document.getElementById(node_name);
        wikiPageTitleNode.value = urlParams.get(get_param_name);
        return true;
    } else {
        return false;
    }
}

if (/^\/wiki_pages\/(\d+\/edit|new)$/.test(window.location.pathname)) {
    let titleFilled = fillFieldFromHashParam("wiki_page_title", "wiki_page[title]");
    console.log('filled title: ' + titleFilled);
    let bodyFilled = fillFieldFromHashParam("wiki_page_body", "wiki_page[body]");
    console.log('filled body: ' + bodyFilled);
    let otherNamesFilled = fillFieldFromHashParam("wiki_page_other_names_string", "wiki_page[other_names_string]");
    console.log('filled other names: ' + otherNamesFilled);
    if (titleFilled || bodyFilled || otherNamesFilled) {
        document.getElementById('wiki_page_is_deleted').checked = false;
    }
}

if (/^\/uploads\/\d+\/assets$/.test(window.location.pathname)) {
    AssetListPage();
}

async function AssetListPage() {
    let tagHTML = '<tr><th>Shared tags</th><td style="width: 100%"><div class="input fixed-width-container"><textarea data-autocomplete="tag-edit" class="text optional ui-autocomplete-input" autocomplete="off" id="shared-tag-textbox" style="width: 100%;"></textarea></div></td></tr><tr><th>Parent</th><td><div><input id="shared-tag-parent" class="string optional"></div><div><a id="save-asset-tags">Save</a></div></td></tr>';
    let savedValue = await GM.getValue('SharedAssetTags', '{}');
    let loadedValue = JSON.parse(savedValue);
    let assetID = window.location.pathname.split('/')[2];
    document.getElementsByClassName("source-data-content")[0].tBodies[0].insertAdjacentHTML("beforeend", tagHTML);

    let tags = (loadedValue[assetID] && loadedValue[assetID].tags) || '';
    let parent = (loadedValue[assetID] && loadedValue[assetID].parent) || '';
    document.getElementById('shared-tag-textbox').value = tags;
    document.getElementById('shared-tag-parent').value = parent;

    window.eval('Danbooru.Autocomplete.initialize_all()');

    document.getElementById('save-asset-tags').addEventListener('click', function() {
        loadedValue[assetID] = {"tags": document.getElementById('shared-tag-textbox').value, "parent": document.getElementById('shared-tag-parent').value};
        let jdata = JSON.stringify(loadedValue);
        GM.setValue('SharedAssetTags', jdata);
    });
}

if (/^\/uploads\/\d+\/assets\/\d+$/.test(window.location.pathname)) {
    AssetDetailPage();
}

async function AssetDetailPage() {
    let assetID = window.location.pathname.split('/')[2];
    let tagString = document.getElementById('post_tag_string')
    let parentInput = document.getElementById('post_parent_id');
    let savedValue = await GM.getValue('SharedAssetTags', '{}');
    let loadedValue = JSON.parse(savedValue);
    let tags = (loadedValue[assetID] && loadedValue[assetID].tags) || '';
    let parent = (loadedValue[assetID] && loadedValue[assetID].parent) || '';
    tagString.value = tagString.value + ' ' + tags;
    parentInput.value = parent;
}
