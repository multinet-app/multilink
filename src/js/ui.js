// Remove config panel if not in query string
function removeConfig(configPanel) {
    configPanel = eval(configPanel);
    if (!configPanel) {
        d3.selectAll('.development').remove();
    }
}

// Attach the search box code to the button
d3.select('#searchButton').on("click", searchForNode());

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
}