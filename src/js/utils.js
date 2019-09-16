// Draws the visualization on first load
async function makeVis() {
    // Load data from the API
    await load_data(workspace, graph)

    loadVis();
    resetSearch();
}

// Clear any values in the search box and the search message
async function resetSearch() {
    d3.select(".searchInput").property("value", "");
    d3.select(".searchMsg").style("display", "none");

    // Clear Selected Node List
    d3.select("#selectedNodeList")
        .selectAll("li")
        .remove();
}

// Load in a .js script
function loadScript(url, callback) {
    return new Promise(function(resolve, reject) {
        var script = document.createElement("script");
        script.type = "text/javascript";
        if (script.readyState) {
            // only required for IE <9
            script.onreadystatechange = function() {
                if (
                    script.readyState === "loaded" ||
                    script.readyState === "complete"
                ) {
                    script.onreadystatechange = null;
                    callback();
                    resolve();
                }
            };
        } else {
            //Others
            script.onload = function() {
                callback();
                resolve();
            };
        }

        script.src = url;
        document.getElementsByTagName("head")[0].appendChild(script);
    });
}

// Get the url querystring variables 
function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&*#]*)/gi, function(m, key, value) {
        console.log(key, value)
        vars[key] = value;
    });
    return vars;
}