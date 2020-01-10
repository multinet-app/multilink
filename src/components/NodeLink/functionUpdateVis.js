/**
 * updateVis and its child functions
 */

import * as d3 from "d3";

function arcPath(leftHand, d, state = false) {
  const {
    graphStructure,
    nodeMarkerLength,
    nodeMarkerHeight,
    visMargins,
    visDimensions,
    straightEdges,
    reloaded,
  } = this;

  let source = state ? { x: state.nodePos[d.source.id].x, y: state.nodePos[d.source.id].y } :
    d.source;
  let target = state ? { x: state.nodePos[d.target.id].x, y: state.nodePos[d.target.id].y } :
    d.target;

  if (reloaded) {
    source = graphStructure.nodes.find(x => x.id === source.id)
    target = graphStructure.nodes.find(x => x.id === target.id)
  }

  let x1 = leftHand ? parseFloat(source.x) + nodeMarkerLength / 2 : target.x,
    y1 = leftHand ? parseFloat(source.y) + nodeMarkerHeight / 2 : target.y,
    x2 = leftHand ? parseFloat(target.x) + nodeMarkerLength / 2 : source.x,
    y2 = leftHand ? parseFloat(target.y) + nodeMarkerHeight / 2 : source.y;

  const horizontalSpace = visDimensions.width - visMargins.left - visMargins.right - nodeMarkerLength;
  const verticalSpace = visDimensions.height - visMargins.bottom - visMargins.top - nodeMarkerHeight;
  x1 = Math.max(visMargins.left + nodeMarkerLength / 2, Math.min(horizontalSpace + visMargins.left + nodeMarkerLength / 2, x1));
  y1 = Math.max(visMargins.top + nodeMarkerHeight / 2, Math.min(verticalSpace + visMargins.top + nodeMarkerHeight / 2, y1));
  x2 = Math.max(visMargins.left + nodeMarkerLength / 2, Math.min(horizontalSpace + visMargins.left + nodeMarkerLength / 2, x2));
  y2 = Math.max(visMargins.top + nodeMarkerHeight / 2, Math.min(verticalSpace + visMargins.top + nodeMarkerHeight / 2, y2));

  const dx = x2 - x1
  const dy = y2 - y1
  const dr = Math.sqrt(dx * dx + dy * dy)
  const drx = dr
  const dry = dr
  const sweep = 1
  const xRotation = 0
  const largeArc = 0

  if (straightEdges) {
    return (`M ${x1} ${y1} L ${x2} ${y2}`);
  } else {
    return (`M ${x1}, ${y1} A ${drx}, ${dry} ${xRotation}, ${largeArc}, ${sweep} ${x2},${y2}`);
  }
}

function dragstarted(d) {
  d.fx = d.x;
  d.fy = d.y;
  this.wasDragged = true;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
  d.x = d3.event.x;
  d.y = d3.event.y;
  this.dragNode();
}

function dragended() {
  const { wasDragged, app, graphStructure, provenance } = this;
  if (wasDragged) {
    //update node position in state graph;
    // updateState("Dragged Node");
    let action = {
      label: "Dragged Node",
      action: () => {
        const currentState = app.currentState();
        //add time stamp to the state graph
        currentState.time = Date.now();
        //Add label describing what the event was
        currentState.event = "Dragged Node";
        //Update node positions
        graphStructure.nodes.map(
          n => (currentState.nodePos[n.id] = { x: n.x, y: n.y })
        );
        return currentState;
      },
      args: []
    };

    provenance.applyAction(action);
  }
  this.wasDragged = false;
}

function dragNode() {
  const {
    svg,
    visDimensions,
    visMargins,
    nodeMarkerHeight,
    nodeMarkerLength,
  } = this;

  svg
    .selectAll(".linkGroup")
    .select("path")
    .attr("d", d => this.arcPath(1, d, false));

  // Get the total space available on the svg
  let horizontalSpace =
    visDimensions.width - visMargins.right - nodeMarkerLength;
  let verticalSpace =
    visDimensions.height - visMargins.top - nodeMarkerHeight;

  // Don't allow nodes to be dragged off the main svg area
  svg
    .selectAll(".nodeGroup").attr("transform", d => {
      d.x = Math.max(visMargins.left, Math.min(horizontalSpace, d.x));
      d.y = Math.max(visMargins.top, Math.min(verticalSpace, d.y));
      return "translate(" + d.x + "," + d.y + ")";
    });
}

function hideTooltip() {
  this.svg.select('.tooltip').transition().duration(100).style("opacity", 0);
}

function makeSimulation() {
  const {
    visDimensions,
    graphStructure,
    nodeMarkerLength,
    nodeMarkerHeight,
  } = this;

  const simulation = d3
    .forceSimulation()
    .force("link", d3.forceLink().id(d => d.id))
    .force("charge", d3.forceManyBody().strength(-300))
    .force(
      "center",
      d3.forceCenter(
        visDimensions.width / 2,
        visDimensions.height / 2
      )
    );

  simulation.nodes(graphStructure.nodes);

  simulation.force("link").links(graphStructure.links);
  simulation.force("link").distance(() => 60)

  simulation.force("center");

  simulation.on("tick", () => this.dragNode());

  simulation.force("collision", d3.forceCollide()
    .radius(() => {
      return (
        d3.max([nodeMarkerLength / 2, nodeMarkerHeight / 2]) *
        1.5
      );
    })
    .strength(0.7)
    .iterations(10)
  );

  // Start the simulation with an alpha target and an alpha min
  // that's a little larger so the sim ends
  simulation.alphaMin(0.025);
  simulation.alphaTarget(0.02).restart();

  return simulation;
}

function showTooltip(data, delay = 200) {
  let tooltip = this.svg.select('.tooltip');
  tooltip.html(data)
    .style("left", (d3.event.clientX + 10) + "px")
    .style("top", (d3.event.clientY - 20) + "px");
  tooltip.transition().duration(delay).style("opacity", .9);
}


function updateVis() {
  const {
    attributes,
    edgeColor,
    graphStructure,
    nodeFontSize,
    labelVariable,
    nodeMarkerLength,
    nodeMarkerHeight,
    svg,
    visMargins,
    visDimensions,
    colorVariable,
    nodeColorScale,
  } = this;

  let node = svg
    .select(".nodes")
    .selectAll(".nodeGroup")
    .data(graphStructure.nodes);

  const nodeEnter = node
    .enter()
    .append("g")
    .attr("class", "nodeGroup")
  nodeEnter.append("rect").attr("class", "nodeBorder nodeBox");
  nodeEnter.append("rect").attr("class", "node nodeBox");
  nodeEnter.append("rect").attr("class", "labelBackground");
  nodeEnter.append("text").classed("label", true);
  node.exit().remove();

  node = nodeEnter.merge(node);

  node.classed("muted", false)
    .classed("selected", false)
    .attr("transform", d => {
      // Get the space we have to work with
      const horizontalSpace = visDimensions.width - visMargins.left - visMargins.right - (2 * nodeMarkerLength);
      const verticalSpace = visDimensions.height - visMargins.bottom - visMargins.top - (2 * nodeMarkerHeight);
      // If no x,y defined, get a random place in the space we have and bump it over by 1 margin
      d.x = d.x === undefined ? (Math.random() * horizontalSpace) + visMargins.left : Math.max(visMargins.left, Math.min(visDimensions.width - nodeMarkerLength - visMargins.right, d.x));
      d.y = d.y === undefined ? (Math.random() * verticalSpace) + visMargins.top : Math.max(visMargins.top, Math.min(visDimensions.height - nodeMarkerHeight - visMargins.bottom, d.y));
      return "translate(" + d.x + "," + d.y + ")";
    });

  node
    .selectAll(".nodeBox")
    .attr("width", () => nodeMarkerLength)
    .attr("height", () => nodeMarkerHeight)
    .attr("rx", () => nodeMarkerLength / 2)
    .attr("ry", () => nodeMarkerHeight / 2);

  node.select('.node')
    .style("fill", d => {
      if (colorVariable === "table") {
        let table = d["id"].split("/")[0]
        return nodeColorScale(table)
      } else {
        return nodeColorScale(d[colorVariable])
      }
    })
    .on("click", (d) => this.nodeClick(d))
    .on("mouseover", (d) => {
      this.showTooltip(d.id);
    })


  node
    .select("text")
    .text(d => d[labelVariable])
    .style("font-size", nodeFontSize + "pt")
    .attr("dx", () => nodeMarkerLength / 2)
    .attr("dy", () => (nodeMarkerHeight / 2) + 2)

  node
    .select(".labelBackground")
    .attr("y", () => nodeMarkerHeight / 2 - 8)
    .attr("width", () => nodeMarkerLength)
    .attr('height', //config.nodeLink.drawBars ? 16 : 
      "1em")

  node.call(
    d3
      .drag()
      .on("start", (d) => this.dragstarted(d))
      .on("drag", (d) => this.dragged(d))
      .on("end", () => this.dragended())
  );

  //Draw Links
  let link = d3
    .select(".links")
    .selectAll(".linkGroup")
    .data(graphStructure.links);

  let linkEnter = link
    .enter()
    .append("g")
    .attr("class", "linkGroup");

  linkEnter.append("path").attr("class", "links");

  linkEnter
    .append("text")
    .attr("class", "edgeArrow")
    .attr("dy", 4)
    .append("textPath")
    .attr("startOffset", "50%");

  link.exit().remove();

  link = linkEnter.merge(link);

  link.classed("muted", false);

  link
    .select("path")
    .style("stroke-width", 3)
    .style("stroke", edgeColor)
    .attr("id", d => d._key)
    .attr("d", d => this.arcPath(1, d))
    .on("mouseover", (d) => {
      let tooltipData = d.id;
      // Add the width attribute to the tooltip
      if (attributes.edgeWidthKey) {
        tooltipData = tooltipData.concat(" [" + d[attributes.edgeWidthKey] + "]")
      }
      this.showTooltip(tooltipData, 400);
    })

    .on("mouseout", () => {
      this.hideTooltip();
    })

  node.on("mouseout", () => {
    this.hideTooltip();
  })

  // drawLegend();
}


export {
  arcPath,
  dragNode,
  dragged,
  dragstarted,
  dragended,
  hideTooltip,
  makeSimulation,
  showTooltip,
  updateVis,
};
