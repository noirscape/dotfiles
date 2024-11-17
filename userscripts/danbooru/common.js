// This is a common library file for both donmai.js and own-server.js .

// BUR functions

// Request helper function
//
// Used in this file and in the scripts to hide a bunch of annoying JS stuff.
// It's async and can only make GET calls to return JSON.
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

// Footer helper function
// meta helper function
function getSlashNode() {
    var slashNode = document.createElement('span');
    slashNode.innerHTML = '/';
    return slashNode;
}

// This function is used to add a link to the footer of a page.
// arguments:
// - text: the text to display in the link
// - css_id: the id to give the link
// - listener: the function to call when the link is clicked
function addFooterLink(text, css_id, listener) {
  document.getElementById("page-footer").appendChild(getSlashNode());
  var aNode = document.createElement('a');
  aNode.innerHTML = text;
  aNode.setAttribute('id', css_id);
  document.getElementById("page-footer").appendChild(aNode);
  document.getElementById(css_id).addEventListener(
    "click", listener, false
  );
}

function setupPostToolbox() {
    // create a new section
    var sectionNode = document.createElement('section');
    sectionNode.setAttribute('id', 'userscript');

    // header it
    var h2Node = document.createElement('h2');
    h2Node.innerHTML = 'Userscript';
    sectionNode.appendChild(h2Node);

    // add the link list
    var ulNode = document.createElement('ul');
    sectionNode.appendChild(ulNode);

    // add it to the sidebar
    document.getElementById("sidebar").appendChild(sectionNode);

    return ulNode; // return the ul node so we can add links to it
}

function addPostToolboxLink(ulNode, class_id, text, listener) {
    var liNode = document.createElement('li');
    var aNode = document.createElement('a');
    aNode.innerHTML = text;
    aNode.setAttribute('id', class_id);

    liNode.appendChild(aNode);
    ulNode.appendChild(liNode);

    document.getElementById(class_id).addEventListener(
        "click", listener, false
    );
}

function addPostToolboxProgressBar(ulNode, class_id, min, max) {
    var liNode = document.createElement('li');
    var progressNode = document.createElement('progress');
    progressNode.setAttribute('id', class_id);
    progressNode.setAttribute('value', min);
    progressNode.setAttribute('max', max);

    liNode.appendChild(progressNode);
    ulNode.appendChild(liNode);
}

function updateProgressBar(id, value) {
    document.getElementById(id).setAttribute('value', value);
}

function deleteProgressBar(id) {
    document.getElementById(id).remove();
}   

// BUR FUNCTIONALITY
//
// This function is used to parse a BUR from a list of tags on a booru; both scripts have some form of support for this.
// return a string with the BUR.
async function parseBURfromTags(tagNames, sourceDomain, destinationDomain) {
    let burString = '';

    let existenceData = await makeRequest(`https://${destinationDomain}/tags.json?search[name_comma]=${tagNames.join(',')}`);
    let existingTags = existenceData.filter(tag => tag.post_count > 0).map(tag => tag.name);

    let aliasData = await makeRequest(`https://${sourceDomain}/tag_aliases.json?search[consequent_name_comma]=${existingTags.join(',')}`);
    let destinationAliases = await makeRequest(`https://${destinationDomain}/tag_aliases.json?search[consequent_name_comma]=${existingTags.join(',')}`);

    for (const alias of aliasData) {
        if (alias.status == 'deleted') {
            continue;
        }

        for (const tag of existingTags) {
            if (alias.consequent_name == tag) {
                console.log("found alias for " + tag);
                let aliasExists = destinationAliases.some(destAlias => destAlias.consequent_name == alias.consequent_name);
                if (!aliasExists) {
                    burString += `alias ${alias.antecedent_name} -> ${alias.consequent_name}\n`;
                };
            }
        }
   }

    let implicationData = await makeRequest(`https://${sourceDomain}/tag_implications.json?search[antecedent_name_comma]=${existingTags.join(',')}`);
    let destinationImplications = await makeRequest(`https://${destinationDomain}/tag_implications.json?search[antecedent_name_comma]=${existingTags.join(',')}`);

    for (const implication of implicationData) {
        if (implication.is_deprecated == true) {
            continue;
        }

        for (const tag of existingTags) {
            if (implication.antecedent_name == tag) {
                console.log("found implication for " + tag);
                let implicationExists = destinationImplications.some(destImplication => destImplication.antecedent_name == implication.antecedent_name);
                if (!implicationExists) {
                    burString += `imply ${implication.antecedent_name} -> ${implication.consequent_name}\n`;
                };
            }
        }
    }

    let tagData = await makeRequest(`https://${sourceDomain}/tags.json?search[name_comma]=${existingTags.join(',')}`);
    let destinationTagData = await makeRequest(`https://${destinationDomain}/tags.json?search[name_comma]=${existingTags.join(',')}`);

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

        let destinationCategory = destinationTagData.find(t => t.name == tag.name).category
        if (category != null && destinationCategory == 0 && destinationCategory != tag.category) {
            burString += `category ${tag.name} -> ${category}\n`;
        }
    }

    return burString;
}