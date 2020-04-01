import * as d3 from "d3";

// Setup function that does initial sizing and setting up of elements for node-link diagram.
export function loadVis() {
  // Get the browser width and height
  this.browser.width = window.innerWidth
  || document.documentElement.clientWidth
  || document.body.clientWidth;

  this.browser.height = window.innerHeight
  || document.documentElement.clientHeight
  || document.body.clientHeight;

  // Set dimensions of the nodelink
  this.visDimensions.width = this.browser.width * 0.75;
  this.visDimensions.height = this.browser.height - 24;

  // Apply the size to the nodelink svg
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

  // Call update vis to append all the data to the svg
  this.updateVis(this.graphStructure);
}
