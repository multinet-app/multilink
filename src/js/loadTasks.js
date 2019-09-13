//global variable that defines the tasks to be shown to the user and the (randomized) order in which to show them
let app;


async function resetPanel() {
    // Clear any values in the search box and the search message
    d3.select(".searchInput").property("value", "");
    d3.select(".searchMsg").style("display", "none");

    // Clear Selected Node List
    d3.select("#selectedNodeList")
        .selectAll("li")
        .remove();
}

async function loadNewGraph(graph_structure) {
    d3.select("#search-input").attr("list", "characters");
    let inputParent = d3.select("#search-input").node().parentNode;

    let datalist = d3
        .select(inputParent)
        .selectAll("#characters")
        .data([0]);

    let enterSelection = datalist
        .enter()
        .append("datalist")
        .attr("id", "characters");

    datalist.exit().remove();

    datalist = enterSelection.merge(datalist);

    let options = datalist.selectAll("option").data(graph_structure.nodes);

    let optionsEnter = options.enter().append("option");
    options.exit().remove();

    options = optionsEnter.merge(options);

    options.attr("value", d => d.shortName);
    options.attr("id", d => d.id);
}

async function loadTasks(tasksType) {
    // Set import scripts
    let scriptTags = [
        "js/nodeLink/main_nodeLink.js",
        "js/nodeLink/helperFunctions.js"
    ];
    let cssTags = [
        "css/nodeLink/node-link.css",
        "css/nodeLink/bulma-checkradio.min.css"
    ]

    const loadAllScripts = async() => {
        return await Promise.all(
            scriptTags.map(async src => {
                return await loadScript(src, () => "");
            })
        );
    };
    await loadAllScripts();

    cssTags.map(href => {
        var newStyleSheet = document.createElement("link");
        newStyleSheet.href = href;
        newStyleSheet.rel = "stylesheet";
        d3.select("head")
            .node()
            .appendChild(newStyleSheet);
    });
}

//function that loads in a .js script tag and only resolves the promise once the script is fully loaded
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