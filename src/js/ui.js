// Remove config panel if not in query string
function removeConfig(configPanel) {
    configPanel = eval(configPanel);
    if (!configPanel) {
        d3.selectAll('.development').remove();
    }
}

// Search for a node in the datalist
function searchForNode() {
    console.log("searching")
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

    //find the right nodeObject
    node = graph_structure.nodes.find(n => n.name.toLowerCase() === selectedOption.toLowerCase());

    if (!node) {
        console.log("not found")
        return -1;
    }

    if (isSelected(node)) {
        console.log("already selected")
        return 0
    } else {
        console.log("selecting")
        nodeClick(node, true);
        return 1
    }
}

function populateSearchList(graph_structure) {
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

    options.attr("value", d => d.name);
    options.attr("id", d => d._key);
}

module.exports = searchFor;