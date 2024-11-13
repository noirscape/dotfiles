// This is a common library file for both donmai.js and own-server.js .

// BUR functions

// Request helper function
//
// Used in this file and in the scripts to hide a bunch of annoying JS stuff.
// It's async and can only make GET calls.
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

// BUR FUNCTIONALITY
//
// This function is used to parse a BUR from a tag on a booru; both scripts have some form of support for this.
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
