import * as d3 from "d3";

// Setup function that does initial sizing and setting up of elements for node-link diagram.
export function loadVis() {
  // Set total dimensions
  // let targetDiv = d3.select("#targetSize");
  this.browser.width = d3
    .select("body")
    .style("width")
    .replace("px", "");
  this.browser.height = d3
    .select("body")
    .style("height")
    .replace("px", "");

  // Set dimensions of the node link
  this.visDimensions.width = this.browser.width * 0.75;
  this.visDimensions.height = this.browser.height * 1;

  // Set dimensions of panel
  this.panelDimensions.width = this.browser.width * 0.25;
  this.panelDimensions.height = this.browser.height * 1;

  // Size panel
  // d3.select("#visPanel").style("width", this.panelDimensions.width + "px");

  // Get with of the content (panel width - margins) as dimensions for the legend
  // let parentWidth = d3
  //   .select("#visPanel")
  //   .select(".content")
  //   .node()
  //   .getBoundingClientRect().width;

  // Size the legend
  // legend = d3
  //   .select("#legend-svg")
  //   .attr("width", parentWidth)
  //   .attr("height", 270);

  // Size the node link
  this.svg = d3
    .select(this.$refs.svg)
    .attr("width", this.visDimensions.width)
    .attr("height", this.visDimensions.height);

  // Set up groups for nodes/links
  this.svg.append("g").attr("class", "links");
  this.svg.append("g").attr("class", "nodes");

  // Add tooltip
  d3.select(this.$el)
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Set up the colorClasses (names of the tables) so we can assign colors based on index later
  // for (const node of this.graphStructure.nodes) {
  //   // Get the table name
  //   const table = node.id.split("/")[0];

  //   // If we haven't seen it, push it to the colorClasses array
  //   if (!this.colorClasses.includes(table)) {
  //     this.colorClasses.push(table);
  //   }
  // }


  // Call update vis to append all the data to the svg
  this.updateVis(this.graphStructure);
}
