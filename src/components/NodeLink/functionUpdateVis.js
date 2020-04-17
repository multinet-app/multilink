/**
 * updateVis and its child functions
 */

import * as d3 from "d3";

function arcPath(d) {
  const {
    nodeMarkerLength,
    nodeMarkerHeight,
    visMargins,
    visDimensions,
    straightEdges,
  } = this;

  let x1 = parseFloat(d.source.x) + nodeMarkerLength / 2;
  let y1 = parseFloat(d.source.y) + nodeMarkerHeight / 2;
  let x2 = parseFloat(d.target.x) + nodeMarkerLength / 2;
  let y2 = parseFloat(d.target.y) + nodeMarkerHeight / 2;

  const horizontalSpace = visDimensions.width - visMargins.left - visMargins.right - nodeMarkerLength;
  const verticalSpace = visDimensions.height - visMargins.bottom - visMargins.top - nodeMarkerHeight;
  x1 = Math.max(visMargins.left + nodeMarkerLength / 2, Math.min(horizontalSpace + visMargins.left + nodeMarkerLength / 2, x1));
  y1 = Math.max(visMargins.top + nodeMarkerHeight / 2, Math.min(verticalSpace + visMargins.top + nodeMarkerHeight / 2, y1));
  x2 = Math.max(visMargins.left + nodeMarkerLength / 2, Math.min(horizontalSpace + visMargins.left + nodeMarkerLength / 2, x2));
  y2 = Math.max(visMargins.top + nodeMarkerHeight / 2, Math.min(verticalSpace + visMargins.top + nodeMarkerHeight / 2, y2));

  const dr = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

  if (straightEdges) {
    return (`M ${x1} ${y1} L ${x2} ${y2}`);
  } else {
    return (`M ${x1}, ${y1} A ${dr}, ${dr} 0, 0, 1 ${x2},${y2}`);
  }
}

function dragStarted(d) {
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

function dragEnded() {
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
    .attr("d", d => this.arcPath(d));

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
      return `translate(${d.x},${d.y})`;
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
    nodeMarkerType,
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

  simulation.force("collision", 
    d3.forceCollide()
    .radius(getForceRadii(nodeMarkerLength, nodeMarkerHeight, nodeMarkerType))
    .strength(0.7)
    .iterations(10)
  );

  // Start the simulation with an alpha target and an alpha min
  // that's a little larger so the sim ends
  simulation.alphaMin(0.025);
  simulation.alphaTarget(0.02).restart();

  return simulation;
}

function getForceRadii(nodeMarkerLength, nodeMarkerHeight, nodeMarkerType) {
  if (nodeMarkerType === "Circle") {
    return d3.max([nodeMarkerLength / 2, nodeMarkerHeight / 2]) * 1.5
  } else {
    return d3.max([nodeMarkerLength , nodeMarkerHeight]) * 0.8
  }
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
    graphStructure,
    nodeFontSize,
    labelVariable,
    nodeMarkerLength,
    nodeMarkerHeight,
    nodeMarkerType,
    svg,
    visMargins,
    visDimensions,
    renderNested,
    colorVariable,
    barVariables,
    glyphVariables,
    widthVariables,
    colorVariables,
    nodeAttrScales,
    linkAttrScales,
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
    .attr("rx", nodeMarkerType === "Circle" ? nodeMarkerLength / 2 : 0)
    .attr("ry", nodeMarkerType === "Circle" ? nodeMarkerHeight / 2 : 0)

  node.select('.node')
    .style("fill", d => {
      if (colorVariable === "table") {
        let table = d["id"].split("/")[0]
        return nodeAttrScales["table"](table)
      } else if (colorVariable) {
        return nodeAttrScales[colorVariable](d[colorVariable])
      } else {
        return '#888888'
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
    .attr("dx", () => {
      return nodeMarkerLength / 2
    })
    .attr("dy", () => {
      if (nodeMarkerType === "Circle" || !renderNested) {
        return (nodeMarkerHeight / 2) + 2
      } else {
        return 8
      }
    })

  node
    .select(".labelBackground")
    .attr("y", () => {
      if (nodeMarkerType === "Circle" || !renderNested) {
        return (nodeMarkerHeight / 2) - 8
      } else {
        return 0
      }
    })
    .attr("width", () => nodeMarkerLength)
    .attr('height', "1em")

  if (renderNested) {
    drawNested(node, nodeMarkerHeight, nodeMarkerLength, barVariables, glyphVariables, graphStructure, nodeAttrScales)
  } else {
    node.selectAll(".bar").remove()
    node.selectAll(".glyph").remove()
  }

  node.call(
    d3
      .drag()
      .on("start", (d) => this.dragStarted(d))
      .on("drag", (d) => this.dragged(d))
      .on("end", () => this.dragEnded())
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
    .style("stroke-width", d => 
      linkAttrScales["width"](d[widthVariables[0]]) > 0 && linkAttrScales["width"](d[widthVariables[0]]) < 20 ? 
        linkAttrScales["width"](d[widthVariables[0]]) : 1
    )
    .style("stroke", d => {
      if (colorVariables[0] !== undefined && linkAttrScales[colorVariables[0]].domain().indexOf(d[colorVariables[0]].toString()) > -1) {
        return linkAttrScales[colorVariables[0]](d[colorVariables[0]])
      } else{
        return "#888888"
      }
    })
    .attr("id", d => d._key)
    .attr("d", d => this.arcPath(d))
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
}

function drawNested(node, nodeMarkerHeight, nodeMarkerLength, barVariables, glyphVariables, graphStructure, nodeAttrScales) {
  // Delete past renders
  node.selectAll(".bar").remove()
  node.selectAll(".glyph").remove()

  // Set some bar specific variables that we'll need for tracking position and sizes
  let i = 0;
  let barWidth = glyphVariables.length === 0 ? 
  nodeMarkerLength / barVariables.length : 
  (nodeMarkerLength / 2) / barVariables.length;

  for (let barVar of barVariables) {
    let maxValue = d3.max(graphStructure.nodes.map(d => parseFloat(d[barVar])));
    // Draw white, background bar
    node.append("rect")
      .attr("class", "bar")
      .attr("width", `${barWidth - 10}px`)
      .attr("height", `${nodeMarkerHeight - 16 - 5 - 5}px`)
      .attr("y", `${16 +  5}px`)
      .attr("x", `${5 + (i * barWidth)}px`)
      .style("fill", "#FFFFFF")

    // Draw the color bar with height based on data
    node.append("rect")
      .attr("class", "bar")
      .attr("width", `${barWidth - 10}px`)
      .attr("height", d => `${domain_safe_mapping(d[barVar], nodeAttrScales[barVar])}px`)
      .attr("y", d => `${nodeMarkerHeight - 5 - domain_safe_mapping(d[barVar], nodeAttrScales[barVar])}px`)
      .attr("x", `${5 + (i * barWidth)}px`)
      .style("fill", d => "#82b1ff")
    
    // Update i
    i++
  }

  // Append glyphs
  if (glyphVariables.length > 0) {
    for (const [index, glyphVar] of glyphVariables.entries()) {
      // Draw glyph
      node.append("rect")
        .attr("class", "glyph")
        .attr("width", `${(nodeMarkerLength / 2) - 5 - 5 - 5}px`)
        .attr("height", `${(nodeMarkerHeight / 2) - 5 - 5 - 5}px`)
        .attr("y", `${16 +  5 + (index * ((nodeMarkerHeight / 2) - 5 - 5 - 5)) + 5*(index)}px`)
        .attr("x", `${5 + ((nodeMarkerLength / 2) - 5 - 5) + 5 + 5}px`)
        .attr("ry", `${((nodeMarkerHeight / 2) - 5 - 5) / 2}px`)
        .attr("rx", `${((nodeMarkerLength / 2) - 5 - 5) / 2}px`)
        .style("fill", d => domain_safe_mapping(d[glyphVar], nodeAttrScales[glyphVar]))
    }
  }
}

  
  // Takes a scale and a value and only maps the value if the value is in the domain
function domain_safe_mapping(value, scale) {
  let inDomain = false;

  if (scale.interpolate !== undefined) {
    // if the scale is numeric
    inDomain = value >= scale.domain()[0] && value <= scale.domain()[1]
  return inDomain ? scale(value) : 0;
  } else {
    // if the scale is categorical
    inDomain = scale.domain().indexOf(value) > -1
    return inDomain ? scale(value) : "";
  }

}

export {
  arcPath,
  dragNode,
  dragged,
  dragStarted,
  dragEnded,
  hideTooltip,
  makeSimulation,
  showTooltip,
  updateVis,
  getForceRadii,
};
