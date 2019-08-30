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
    task.startTime = new Date().toString();

    d3.selectAll(".taskShortcut").classed("currentTask", function() {
        return d3.select(this).attr("id") === taskList[currentTask].taskID;
    });

    //Only start off with the submit button enabled for when the task only requires an unspecified node count;

    let flexibleAnswer =
        task.replyType.includes("multipleNodeSelection") &&
        task.replyCount.type === "at least";

    // clear any values in the feedback or search box;
    d3.select(".modalFeedback")
        .select(".textarea")
        .property("value", "");

    d3.select(".searchInput").property("value", "");

    d3.select(".searchMsg").style("display", "none");

    d3.select("#answerBox").property("value", "");

    d3.selectAll(".submit").attr("disabled", flexibleAnswer ? null : true);

    // d3.select('#nextTrialTask').style('display','none');
    // d3.select('#trialFeedback').select('.errorMsg').style('display','none');
    // d3.select('#trialFeedback').select('.correctMsg').style('display','none');

    // //Clear Selected Node List
    d3.select("#selectedNodeList")
        .selectAll("li")
        .remove();

    //clear any selected Radio buttons in the feedback box;
    d3.select(".modalFeedback")
        .selectAll("input")
        .property("checked", false);

    //check for different reply types

    if (task.replyType.includes("value")) {
        d3.select("#valueAnswer").style("display", "inline");
    } else {
        d3.select("#valueAnswer").style("display", "none");
    }

    if (
        task.replyType.includes("singleNodeSelection") ||
        task.replyType.includes("multipleNodeSelection")
    ) {
        d3.select("#nodeAnswer").style("display", "block");
    } else {
        d3.select("#nodeAnswer").style("display", "none");
    }

    d3.select("#taskArea")
        // .select(".card-header-title")
        .select(".taskText")
        .text(task.prompt + " (" + task.taskID + ")");

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

    //Helper function to shuffle the order of tasks given - based on https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
            [array[i], array[j]] = [array[j], array[i]]; // swap elements
        }
    }

    let taskListFiles = { "heuristics": "taskLists/heuristics.json" };
    // let conditions = conditionsObj.data().conditionList;

    let group;

    // dynamically assign a vistype according to firebase tracking
    group = visType === "nodeLink" ? 0 : 1;

    // let selectedCondition = conditions[group];
    let selectedVis = visType;

    vis = selectedVis;

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

d3.select('#searchButton').on("click", function() {

    let selectedOption = d3.select('.searchInput').property("value").trim();

    //empty search box;
    if (selectedOption.length === 0) {
        d3.select(".searchMsg")
            .style("display", "block")
            .text("Please enter a node name to search for!");
        return;
    }

    let searchSuccess = vis == 'nodeLink' ? searchFor(selectedOption) : window.controller.view.search(selectedOption);

    if (searchSuccess === -1) {
        d3.select(".searchMsg")
            .style("display", "block")
            .text("Could not find a node with that name!");
    }

    if (searchSuccess === 1) {
        d3.select(".searchMsg").style("display", "none");

        // d3.select('#clear-selection').attr('disabled', null)
    }

    if (searchSuccess === 0) {
        d3.select(".searchMsg")
            .style("display", "block")
            .text(selectedOption + " is already selected.");
    }

});

// /