// Search box code
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