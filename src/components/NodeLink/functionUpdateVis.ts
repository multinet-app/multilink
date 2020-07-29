import { event, select } from 'd3-selection';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { max } from 'd3-array';
import { drag } from 'd3-drag';
import { selectNode } from '@/lib/provenance';
import { Simulation } from '@types/d3';
import { Node, State } from '@/types';
import { Provenance } from '@visdesignlab/provenance-lib-core';

export function arcPath(leftHand, d, state = false) {
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
    source = graphStructure.nodes.find((x) => x.id === source.id);
    target = graphStructure.nodes.find((x) => x.id === target.id);
  }

  let x1 = leftHand ? parseFloat(source.x) + nodeMarkerLength / 2 : target.x;
  let y1 = leftHand ? parseFloat(source.y) + nodeMarkerHeight / 2 : target.y;
  let x2 = leftHand ? parseFloat(target.x) + nodeMarkerLength / 2 : source.x;
  let y2 = leftHand ? parseFloat(target.y) + nodeMarkerHeight / 2 : source.y;

  const horizontalSpace = visDimensions.width - visMargins.left - visMargins.right - nodeMarkerLength;
  const verticalSpace = visDimensions.height - visMargins.bottom - visMargins.top - nodeMarkerHeight;
  x1 = Math.max(
    visMargins.left + nodeMarkerLength / 2,
    Math.min(horizontalSpace + visMargins.left + nodeMarkerLength / 2, x1),
  );
  y1 = Math.max(
    visMargins.top + nodeMarkerHeight / 2,
    Math.min(verticalSpace + visMargins.top + nodeMarkerHeight / 2, y1),
  );
  x2 = Math.max(
    visMargins.left + nodeMarkerLength / 2,
    Math.min(horizontalSpace + visMargins.left + nodeMarkerLength / 2, x2),
  );
  y2 = Math.max(
    visMargins.top + nodeMarkerHeight / 2,
    Math.min(verticalSpace + visMargins.top + nodeMarkerHeight / 2, y2),
  );

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dr = Math.sqrt(dx * dx + dy * dy);
  const drx = dr;
  const dry = dr;
  const sweep = 1;
  const xRotation = 0;
  const largeArc = 0;

  if (straightEdges) {
    return (`M ${x1} ${y1} L ${x2} ${y2}`);
  } else {
    return (`M ${x1}, ${y1} A ${drx}, ${dry} ${xRotation}, ${largeArc}, ${sweep} ${x2},${y2}`);
  }
}

export function dragstarted(d: Node): void {
  d.fx = d.x;
  d.fy = d.y;
  this.wasDragged = true;
}

export function dragged(d: Node): void {
  d.fx = event.x;
  d.fy = event.y;
  d.x = event.x;
  d.y = event.y;
  this.dragNode();
}

export function dragended(): void {
  const { wasDragged, graphStructure, provenance } = this;
  if (wasDragged) {
    // update node position in state graph;
    // updateState("Dragged Node");
    const action = {
      label: 'Dragged Node',
      action: () => {
        const currentState = app.currentState();
        // add time stamp to the state graph
        currentState.time = Date.now();
        // Add label describing what the event was
        currentState.event = 'Dragged Node';
        // Update node positions
        graphStructure.nodes.map(
          (n: Node) => (currentState.nodePos[n.id] = { x: n.x, y: n.y }),
        );
        return currentState;
      },
      args: [],
    };

    provenance.applyAction(action);
  }
  this.wasDragged = false;
}

export function dragNode(): void {
  const {
    svg,
    visDimensions,
    visMargins,
    nodeMarkerHeight,
    nodeMarkerLength,
  } = this;

  svg
    .selectAll('.linkGroup')
    .select('path')
    .attr('d', (d) => this.arcPath(1, d, false));

  // Get the total space available on the svg
  const horizontalSpace =
    visDimensions.width - visMargins.right - nodeMarkerLength;
  const verticalSpace =
    visDimensions.height - visMargins.top - nodeMarkerHeight;

  // Don't allow nodes to be dragged off the main svg area
  svg
    .selectAll('.nodeGroup').attr('transform', (d) => {
      d.x = Math.max(visMargins.left, Math.min(horizontalSpace, d.x));
      d.y = Math.max(visMargins.top, Math.min(verticalSpace, d.y));
      return 'translate(' + d.x + ',' + d.y + ')';
    });
}

export function hideTooltip(): void {
  this.svg.select('.tooltip').transition().duration(100).style('opacity', 0);
}

export function makeSimulation(): Simulation {
  const {
    visDimensions,
    graphStructure,
    nodeMarkerLength,
    nodeMarkerHeight,
    renderNested,
  } = this;

  const simulation = forceSimulation()
    .force('link', forceLink().id((d) => d.id))
    .force('charge', forceManyBody().strength(-300))
    .force(
      'center',
      forceCenter(
        visDimensions.width / 2,
        visDimensions.height / 2,
      ),
    );

  simulation.nodes(graphStructure.nodes);

  simulation.force('link').links(graphStructure.links);
  simulation.force('link').distance(() => 60);

  simulation.force('center');

  simulation.on('tick', () => this.dragNode());

  simulation.force('collision',
    forceCollide()
    .radius(getForceRadii(nodeMarkerLength, nodeMarkerHeight, renderNested))
    .strength(0.7)
    .iterations(10),
  );

  // Start the simulation with an alpha target and an alpha min
  // that's a little larger so the sim ends
  simulation.alphaMin(0.025);
  simulation.alphaTarget(0.02).restart();

  return simulation;
}

export function getForceRadii(nodeMarkerLength, nodeMarkerHeight, renderNested) {
  if (renderNested) {
    return max([nodeMarkerLength , nodeMarkerHeight]) * 0.8;
  } else {
    return max([nodeMarkerLength / 2, nodeMarkerHeight / 2]) * 1.5;
  }
}

export function showTooltip(message: string, delay = 200) {
  const tooltip = select('.tooltip');
  tooltip.html(message)
    .style('left', (event.clientX + 10) + 'px')
    .style('top', (event.clientY - 20) + 'px');
  tooltip.transition().duration(delay).style('opacity', .9);
}

export function updateVis(provenance: Provenance<State, any, any>): void {
  const {
    attributes,
    graphStructure,
    nodeFontSize,
    labelVariable,
    nodeMarkerLength,
    nodeMarkerHeight,
    svg,
    visMargins,
    visDimensions,
    renderNested,
    colorVariable,
    nodeColorScale,
    barVariables,
    glyphVariables,
    linkColorScale,
    linkWidthScale,
    widthVariables,
    colorVariables,
    glyphColorScale,
  } = this;

  let node = svg
    .select('.nodes')
    .selectAll('.nodeGroup')
    .data(graphStructure.nodes);

  const nodeEnter = node
    .enter()
    .append('g')
    .attr('class', 'nodeGroup');
  nodeEnter.append('rect').attr('class', 'nodeBorder nodeBox');
  nodeEnter.append('rect').attr('class', 'node nodeBox');
  nodeEnter.append('rect').attr('class', 'labelBackground');
  nodeEnter.append('text').classed('label', true);
  node.exit().remove();

  node = nodeEnter.merge(node);

  node.classed('muted', false)
    .classed('selected', false)
    .attr('transform', (d) => {
      // Get the space we have to work with
      const horizontalSpace = visDimensions.width - visMargins.left - visMargins.right - (2 * nodeMarkerLength);
      const verticalSpace = visDimensions.height - visMargins.bottom - visMargins.top - (2 * nodeMarkerHeight);
      // If no x,y defined, get a random place in the space we have and bump it over by 1 margin
      d.x = d.x === undefined ? (Math.random() * horizontalSpace) + visMargins.left :
        Math.max(visMargins.left, Math.min(visDimensions.width - nodeMarkerLength - visMargins.right, d.x));
      d.y = d.y === undefined ? (Math.random() * verticalSpace) + visMargins.top :
        Math.max(visMargins.top, Math.min(visDimensions.height - nodeMarkerHeight - visMargins.bottom, d.y));
      return 'translate(' + d.x + ',' + d.y + ')';
    });

  node
    .selectAll('.nodeBox')
    .attr('width', () => nodeMarkerLength)
    .attr('height', () => nodeMarkerHeight)
    .attr('rx', renderNested ? 0 : nodeMarkerLength / 2)
    .attr('ry', renderNested ? 0 : nodeMarkerHeight / 2);

  node.select('.node')
    .style('fill', (d) => {
      if (colorVariable === 'table') {
        const table = d.id.split('/')[0];
        return nodeColorScale(table);
      } else {
        return nodeColorScale(d[colorVariable]);
      }
    })
    .on('click', (n: Node) => selectNode(n, provenance))
    .on('mouseover', (d: Node) => {
      this.showTooltip(d.id);
    });


  node
    .select('text')
    .text((d) => d[labelVariable])
    .style('font-size', nodeFontSize + 'pt')
    .attr('dx', nodeMarkerLength / 2)
    .attr('dy', renderNested ? 8 : (nodeMarkerHeight / 2) + 2);

  node
    .select('.labelBackground')
    .attr('y', () => renderNested ? 0 : (nodeMarkerHeight / 2) - 8)
    .attr('width', () => nodeMarkerLength)
    .attr('height', '1em');

  if (renderNested) {
    drawNested(node, nodeMarkerHeight, nodeMarkerLength, glyphColorScale, barVariables, glyphVariables, graphStructure);
  } else {
    node.selectAll('.bar').remove();
    node.selectAll('.glyph').remove();
  }

  node.call(
    drag()
      .on('start', (d) => this.dragstarted(d))
      .on('drag', (d) => this.dragged(d)),
      // .on("end", () => this.dragended())
  );

  // Draw Links
  let link = select('.links')
    .selectAll('.linkGroup')
    .data(graphStructure.links);

  const linkEnter = link
    .enter()
    .append('g')
    .attr('class', 'linkGroup');

  linkEnter.append('path').attr('class', 'links');

  linkEnter
    .append('text')
    .attr('class', 'edgeArrow')
    .attr('dy', 4)
    .append('textPath')
    .attr('startOffset', '50%');

  link.exit().remove();

  link = linkEnter.merge(link);

  link.classed('muted', false);
  link
    .select('path')
    .style('stroke-width', (d) =>
      linkWidthScale(d[widthVariables[0]]) > 0 && linkWidthScale(d[widthVariables[0]]) < 20 ?
        linkWidthScale(d[widthVariables[0]]) : 1,
    )
    .style('stroke', (d) => {
      if (colorVariables[0] !== undefined && linkColorScale.domain().indexOf(d[colorVariables[0]].toString()) > -1) {
        return linkColorScale(d[colorVariables[0]]);
      } else {
        return '#888888';
      }
    })
    .attr('id', (d) => d._key)
    .attr('d', (d) => this.arcPath(1, d))
    .on('mouseover', (d) => {
      let tooltipData = d.id;
      // Add the width attribute to the tooltip
      if (attributes.edgeWidthKey) {
        tooltipData = tooltipData.concat(' [' + d[attributes.edgeWidthKey] + ']');
      }
      this.showTooltip(tooltipData, 400);
    })

    .on('mouseout', () => {
      this.hideTooltip();
    });

  node.on('mouseout', () => {
    this.hideTooltip();
  });
}

function drawNested(
  node,
  nodeMarkerHeight,
  nodeMarkerLength,
  glyphColorScale,
  barVariables,
  glyphVariables,
  graphStructure,
) {
  // Delete past renders
  node.selectAll('.bar').remove();
  node.selectAll('.glyph').remove();

  // Set some bar specific variables that we'll need for tracking position and sizes
  let i = 0;
  const barWidth = glyphVariables.length === 0 ?
    nodeMarkerLength / barVariables.length :
    (nodeMarkerLength / 2) / barVariables.length;

  for (const barVar of barVariables) {
    const maxValue = max(graphStructure.nodes.map((o) => parseFloat(o[barVar])));
    // Draw white, background bar
    node.append('rect')
      .attr('class', 'bar')
      .attr('width', `${barWidth - 10}px`)
      .attr('height', `${nodeMarkerHeight - 16 - 5 - 5}px`)
      .attr('y', `${16 +  5}px`)
      .attr('x', `${5 + (i * barWidth)}px`)
      .style('fill', '#FFFFFF');

    // Draw the color bar with height based on data
    node.append('rect')
      .attr('class', 'bar')
      .attr('width', `${barWidth - 10}px`)
      .attr('height', (d) => `${(nodeMarkerHeight - 16 - 5 - 5) * d[barVar] / maxValue}px`)
      .attr('y', (d) => `${nodeMarkerHeight - 5 - ((nodeMarkerHeight - 16 - 5 - 5) * d[barVar] / maxValue)}px`)
      .attr('x', `${5 + (i * barWidth)}px`)
      .style('fill', (d) => '#82b1ff');

    // Update i
    i++;
  }

  // Append glyphs
  i = 0;
  while (i < 2) {
    const glyphVar = glyphVariables[i];
    if (glyphVar === undefined) {
      break;
    }
    // Draw glyph
    node.append('rect')
      .attr('class', 'glyph')
      .attr('width', `${(nodeMarkerLength / 2) - 5 - 5 - 5}px`)
      .attr('height', `${(nodeMarkerHeight / 2) - 5 - 5 - 5}px`)
      .attr('y', `${16 +  5 + (i * ((nodeMarkerHeight / 2) - 5 - 5 - 5)) + 5 * (i)}px`)
      .attr('x', `${5 + ((nodeMarkerLength / 2) - 5 - 5) + 5 + 5}px`)
      .attr('ry', `${((nodeMarkerHeight / 2) - 5 - 5) / 2}px`)
      .attr('rx', `${((nodeMarkerLength / 2) - 5 - 5) / 2}px`)
      .style('fill', (d) => glyphColorScale(d[glyphVar]));

    // Update i
    i++;
  }
}

export function highlightSelectedNodes(state: State): void {
  // Set the class of everything to 'muted', except for the selected node and it's neighbors
  select('.nodes')
    .selectAll('.nodeGroup')
    .classed('muted', (n: any) => {
      n = n as Node;
      return (
        Object.keys(state.selected).length > 0 &&
        !Object.keys(state.selected).includes(n.id) &&
        !Array<string>().concat(...Object.values(state.selected)).includes(n.id)
      );
    });

  // Set the class of a clicked node to clicked
  select('.nodes')
    .selectAll('.node')
    .classed('clicked', (n: any) => {
      n = n as Node;
      return Object.keys(state.selected).includes(n.id);
    });
}

export function highlightLinks(state: State): void {
  const linksToHighlight = state.network.links.map((l: Link) => {
    if (l.source.id in state.selected || l.target.id in state.selected) {
      return l.id;
    }
  });

  select('.links')
    .selectAll('.linkGroup')
    .classed('muted', (l: any) => {
      l = l as Link;
      return Object.keys(state.selected).length > 0 && !linksToHighlight.includes(l.id);
    });
}

export function releaseNodes(network: Network, simulation: Simulation<Node, Link>) {
  // Release the pinned nodes
  network.nodes.map((n: Node) => {
    n.fx = null;
    n.fy = null;
  });
  startSimulation(simulation);
}

export function startSimulation(this: any, simulation: Simulation<Node, Link>) {
  // Update the force radii
  simulation.force('collision',
    forceCollide()
    .radius(getForceRadius(this.nodeMarkerLength, this.nodeMarkerHeight, this.renderNested))
    .strength(0.7)
    .iterations(10),
  );

  simulation.alpha(0.5);
  // simulation.alphaTarget(0.02).restart();
}

export function stopSimulation(network: Network, simulation: Simulation<Node, Link>) {
  simulation.stop();
  network.nodes.map((n: Node) => {
    n.savedX = n.x;
    n.savedY = n.y;
  });
}
