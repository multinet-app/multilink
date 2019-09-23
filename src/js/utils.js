// Utility functions not related to the visualization

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
        vars[key] = value;
    });
    return vars;
}

module.exports = getUrlVars;