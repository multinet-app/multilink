// Remove config panel if not in query string
function toggleConfig(configToggle) {
    if (configToggle === "false" || configToggle === "0" || !configToggle) {
        d3.selectAll('.development')
            .style("display", "None")
        configToggle = !configToggle
    } else {
        d3.selectAll('.development')
            .style("display", "")
        configToggle = !configToggle
    }

    return configToggle;
}

// Search for a node in the datalist
function searchForNode() {
    let selectedOption = d3.select('.searchInput').property("value").trim();

    //empty search box;
    if (selectedOption.length === 0) {
        d3.select(".searchMsg")
            .style("display", "block")
            .text("Please enter a node name to search for!");
        return;
    }

    let searchSuccess = searchFor(selectedOption);

    if (searchSuccess === -1) {
        d3.select(".searchMsg")
            .style("display", "block")
            .text("Could not find a node with that name!");
    }

    if (searchSuccess === 1) {
        d3.select(".searchMsg").style("display", "none");
    }

    if (searchSuccess === 0) {
        d3.select(".searchMsg")
            .style("display", "block")
            .text(selectedOption + " is already selected.");
    }

    return searchSuccess;
}

//function that searches for and 'clicks' on node, returns -1 if can't find that node, 0 if nodes is already selected, 1 if node exists and was not selected
function searchFor(selectedOption) {
    node = vis.graph_structure.nodes.find(n => n.name.toLowerCase() === selectedOption.toLowerCase());

    if (node === undefined) {
        return -1;
    } else if (isSelected(node)) {
        return 0
    } else {
        nodeClick(node, true);
        return 1
    }
}

//function that checks the state to see if the node is selected
function isSelected(node) {
    const currentState = app.currentState();
    let selected = currentState.selected;
    return selected.includes(node.id);
}

//function that updates the state, and includes a flag for when this was done through a search
function nodeClick(node, search = false) {
    const currentState = app.currentState();
    let selected = currentState.selected;
    let wasSelected = isSelected(node);

    if (wasSelected) {
        selected = selected.filter(s => s !== node.id);
    } else {
        selected.push(node.id);
    }

    let neighbors_and_edges = tagNeighbors(selected);

    let label = search ?
        "Searched for Node" :
        wasSelected ?
        "Unselect Node" :
        "Select Node";

    let action = {
        label: label,
        action: () => {
            const currentState = app.currentState();
            //add time stamp to the state graph
            currentState.time = Date.now();
            //Add label describing what the event was
            currentState.event = label;
            //Update actual node data
            currentState.selected = selected;
            currentState.userSelectedNeighbors = neighbors_and_edges.neighbors;
            currentState.userSelectedEdges = neighbors_and_edges.edges;
            //If node was searched, push him to the search array
            if (search) {
                currentState.search.push(node.id);
            }
            return currentState;
        },
        args: []
    };

    provenance.applyAction(action);
}

function populateSearchList() {
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

    let options = datalist.selectAll("option").data(vis.graph_structure.nodes);

    let optionsEnter = options.enter().append("option");
    options.exit().remove();

    options = optionsEnter.merge(options);

    options.attr("value", d => d.name);
    options.attr("id", d => d.id);
}

function clearSelections() {
    let selected = [];
    let neighbors = [];
    let edges = [];
    let label = "Cleared selections";

    let action = {
        label: label,
        action: () => {
            const currentState = app.currentState();
            //add time stamp to the state graph
            currentState.time = Date.now();
            //Add label describing what the event was
            currentState.event = label;
            //Update actual node data
            currentState.selected = selected;
            currentState.userSelectedNeighbors = neighbors;
            currentState.userSelectedEdges = edges;
            return currentState;
        },
        args: []
    };

    provenance.applyAction(action);

}

function tagNeighbors(selected) {
    let neighbors = [];
    let edges = []

    for (clicked_node of selected) {
        if (!vis.simOn) {
            neighbor_nodes = vis.graph_structure.links.map((e, i) => e.source === clicked_node ? [e.target, vis.graph_structure.links[i].id] : e.target === clicked_node ? [e.source, vis.graph_structure.links[i].id] : "")
        } else {
            neighbor_nodes = vis.graph_structure.links.map((e, i) => e.source.id === clicked_node ? [e.target.id, vis.graph_structure.links[i].id] : e.target.id === clicked_node ? [e.source.id, vis.graph_structure.links[i].id] : "")
        }


        for (node of neighbor_nodes) {
            // push nodes
            if (node[0] !== "" && neighbors.indexOf(node[0]) === -1) {
                neighbors.push(node[0]);
            }

            // push edges
            if (node[1] !== "" && edges.indexOf(node[1]) === -1) {
                edges.push(node[1]);
            }
        }
    }

    return { "neighbors": neighbors, "edges": edges };
}

module.exports = { searchFor, isSelected };