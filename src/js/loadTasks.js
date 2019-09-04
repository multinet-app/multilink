//global variable that defines the tasks to be shown to the user and the (randomized) order in which to show them
var taskList;
let workerID; // to be populated when the user goes through the consent form;
let currentTask; //start at task 0
let onTrials = false;
let participantCollection;
// let vis;
let app;


async function resetPanel() {

    let task = taskList[currentTask];

    // Clear any values in the search box and the search message
    d3.select(".searchInput").property("value", "");
    d3.select(".searchMsg").style("display", "none");

    // Clear Selected Node List
    d3.select("#selectedNodeList")
        .selectAll("li")
        .remove();

    config = task.config;

    await loadNewGraph(config.graphFiles[config.loadedGraph]);

    if (vis === "nodeLink") {
        loadTask(task);
    } else {
        console.log()
        window.controller.loadTask(currentTask);
    }
}

async function loadNewGraph(fileName) {
    // console.log('loading ', fileName)
    graph = await d3.json(fileName);

    // console.log(graph.links)
    //
    //update the datalist associated to the search box (in case the nodes in the new graph have changed)
    //if (vis === 'nodeLink'){
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

    let options = datalist.selectAll("option").data(graph.nodes);

    let optionsEnter = options.enter().append("option");
    options.exit().remove();

    options = optionsEnter.merge(options);

    options.attr("value", d => d.shortName);
    options.attr("id", d => d.id);
    // options.attr('onclick',"console.log('clicked')");

    // options.on("click",console.log('clicked an option!'))
}

async function loadTasks(visType, tasksType) {
    //reset currentTask to 0
    currentTask = 0;

    let taskListFiles = { "heuristics": "taskLists/heuristics.json" };
    // let conditions = conditionsObj.data().conditionList;

    // let selectedCondition = conditions[group];

    // Hard-coded the vis to be nodeLink
    let selectedVis = (
        vis ||
        "nodeLink" ||
        "adjMatrix"
    );

    //do an async load of the designated task list;
    console.log(taskListFiles, tasksType)
    let taskListObj = await d3.json(taskListFiles[tasksType]);

    let taskListEntries = Object.entries(taskListObj);

    // insert order and taskID into each element in this list
    taskList = taskListEntries.map((t, i) => {
        let task = t[1];
        task.order = i;
        task.taskID = t[0];
        task.workerID = workerID;
        return task;
    });

    //remove divs that are irrelevant to the vis approach being used am/nl
    if (selectedVis === "nodeLink") {
        d3.selectAll(".adjMatrix").remove();
    } else {
        d3.selectAll(".nodeLink").remove();
    }

    //load script tags if this is the trials page or if there were no trials for this setup)

    if (tasksType === "trials" || !trials) {
        let scriptTags = {
            nodeLink: [
                "js/nodeLink/main_nodeLink.js",
                "js/nodeLink/helperFunctions.js"
            ],
            adjMatrix: [
                "js/adjMatrix/libs/reorder/science.v1.js",
                "js/adjMatrix/libs/reorder/tiny-queue.js",
                "js/adjMatrix/libs/reorder/reorder.v1.js",
                "js/adjMatrix/fill_config_settings.js",
                "js/adjMatrix/autocomplete.js",
                "js/adjMatrix/view.js",
                "js/adjMatrix/controller.js",
                "js/adjMatrix/model.js",
                "js/adjMatrix/helper_functions.js"
            ]
        };
        let cssTags = {
            nodeLink: [
                "css/nodeLink/node-link.css",
                "css/nodeLink/bulma-checkradio.min.css"
            ],
            adjMatrix: ["css/adjMatrix/adj-matrix.css"]
        };

        // //   dynamically load only js/css relevant to the vis approach being used;
        const loadAllScripts = async() => {
            return await Promise.all(
                scriptTags[selectedVis].map(async src => {
                    return await loadScript(src, () => "");
                })
            );
        };

        console.log(selectedVis)
        await loadAllScripts();

        cssTags[selectedVis].map(href => {
            var newStyleSheet = document.createElement("link");
            newStyleSheet.href = href;
            newStyleSheet.rel = "stylesheet";
            d3.select("head")
                .node()
                .appendChild(newStyleSheet);
        });
    }
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