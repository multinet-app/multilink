import {
  Selection, select, selectAll, BaseType,
} from 'd3-selection';
import {
  forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, Simulation, ForceLink,
} from 'd3-force';
import { max } from 'd3-array';
import { D3DragEvent, drag } from 'd3-drag';
import { ScaleOrdinal } from 'd3-scale';
// eslint-disable-next-line import/no-cycle
import { selectNode, ProvenanceEvents } from '@/lib/provenance';
import {
  Node, State, Link, Network, Dimensions,
} from '@/types';
import { Provenance } from '@visdesignlab/trrack';

export function arcPath(
  d: any,
  state: State,
  visDimensions: Dimensions,
  visMargins: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  },
  straightEdges: boolean,
) {
  const source: Node = state.network.nodes.find((n: Node) => n.id === d.source as string) || d.source as Node;
  const target: Node = state.network.nodes.find((n: Node) => n.id === d.target as string) || d.target as Node;

  if (!source || !target) {
    throw new Error('Couldn\'t find the source or target for a link, didn\'t draw arc.');
  }

  let x1 = source.x + state.nodeMarkerLength / 2;
  let y1 = source.y + state.nodeMarkerHeight / 2;
  let x2 = target.x + state.nodeMarkerLength / 2;
  let y2 = target.y + state.nodeMarkerHeight / 2;

  const horizontalSpace = visDimensions.width - visMargins.left
    - visMargins.right - state.nodeMarkerLength;
  const verticalSpace = visDimensions.height - visMargins.bottom
    - visMargins.top - state.nodeMarkerHeight;
  x1 = Math.max(
    visMargins.left + state.nodeMarkerLength / 2,
    Math.min(horizontalSpace + visMargins.left + state.nodeMarkerLength / 2, x1),
  );
  y1 = Math.max(
    visMargins.top + state.nodeMarkerHeight / 2,
    Math.min(verticalSpace + visMargins.top + state.nodeMarkerHeight / 2, y1),
  );
  x2 = Math.max(
    visMargins.left + state.nodeMarkerLength / 2,
    Math.min(horizontalSpace + visMargins.left + state.nodeMarkerLength / 2, x2),
  );
  y2 = Math.max(
    visMargins.top + state.nodeMarkerHeight / 2,
    Math.min(verticalSpace + visMargins.top + state.nodeMarkerHeight / 2, y2),
  );

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dr = Math.sqrt(dx * dx + dy * dy);
  const sweep = 1;
  const xRotation = 0;
  const largeArc = 0;

  if (straightEdges) {
    return (`M ${x1} ${y1} L ${x2} ${y2}`);
  }
  return (`M ${x1}, ${y1} A ${dr}, ${dr} ${xRotation}, ${largeArc}, ${sweep} ${x2},${y2}`);
}

export function dragNode(this: any, state: State, that?: any): void {
  const env = this ? this : that;
  const currentState = env.provenance.current().getState();

  selectAll('.linkGroup')
    .select('path')
    .attr('d', (l: unknown) => arcPath(
      l,
      currentState,
      env.visDimensions,
      env.visMargins,
      env.straightEdges,
    ));

  // Get the total space available on the svg
  const horizontalSpace = env.visDimensions.width - env.visMargins.right - state.nodeMarkerLength;
  const verticalSpace = env.visDimensions.height - env.visMargins.top - state.nodeMarkerHeight;

  // Don't allow nodes to be dragged off the main svg area
  env.svg
    .selectAll('.nodeGroup').attr('transform', (d: Node) => {
      d.x = Math.max(env.visMargins.left, Math.min(horizontalSpace, d.x));
      d.y = Math.max(env.visMargins.top, Math.min(verticalSpace, d.y));

      return `translate(${d.x},${d.y})`;
    });
}

export function dragStarted(d: Node): void {
  d.fx = d.x;
  d.fy = d.y;
}

export function dragged(this: unknown, d: Node, event: D3DragEvent<Element, Node, unknown>, state: State): void {
  d.fx = event.x;
  d.fy = event.y;
  d.x = event.x;
  d.y = event.y;
  dragNode(state, this);
}

export function dragEnded(this: any): void {
  // update node position in state graph;
  // updateState("Dragged Node");
  const action = {
    label: 'Dragged Node',
    action: () => {
      const currentState = this.provenance.current().getState();
      // add time stamp to the state graph
      currentState.time = Date.now();
      // Add label describing what the event was
      currentState.event = 'Dragged Node';
      // Update node positions
      this.graphStructure.nodes.forEach(
        (n: Node) => {
          currentState.nodePos[n.id] = { x: n.x, y: n.y };
        },
      );
      return currentState;
    },
    args: [],
  };

  this.provenance.applyAction(action);
}

export function hideTooltip(this: any): void {
  (select('.tooltip') as any).transition().duration(100).style('opacity', 0);
}

export function getForceRadius(nodeMarkerLength: number, nodeMarkerHeight: number, renderNested: boolean) {
  if (renderNested) {
    const radius = max([nodeMarkerLength, nodeMarkerHeight]) || 0;
    return radius * 0.8;
  }
  const radius = max([nodeMarkerLength / 2, nodeMarkerHeight / 2]) || 0;
  return radius * 1.5;
}

export function makeSimulation(this: any, state: State): Simulation<Node, Link> {
  const simulation = forceSimulation<Node, Link>()
    .force('link', forceLink().id((l: unknown) => {
      const link = l as Link;
      return link.id;
    }))
    .force('charge', forceManyBody().strength(-300))
    .force(
      'center',
      forceCenter(
        this.visDimensions.width / 2,
        this.visDimensions.height / 2,
      ),
    );

  simulation.nodes(state.network.nodes);

  const simulationLinks: ForceLink<Node, Link> | undefined = simulation.force('link');

  if (simulationLinks !== undefined) {
    simulationLinks.links(state.network.links);
    simulationLinks.distance(() => 60);
  }

  simulation.force('link');
  simulation.force('center');
  simulation.on('tick', () => dragNode(state, this));

  simulation.force('collision',
    forceCollide()
      .radius(getForceRadius(state.nodeMarkerLength, state.nodeMarkerHeight, this.renderNested))
      .strength(0.7)
      .iterations(10));

  // Start the simulation with an alpha target and an alpha min
  // that's a little larger so the sim ends
  simulation.alphaMin(0.025);
  simulation.alphaTarget(0.02).restart();

  return simulation;
}

export function showTooltip(message: string, event: MouseEvent, delay = 200) {
  const tooltip = select('.tooltip') as any;
  tooltip.html(message)
    .style('left', `${event.clientX + 10}px`)
    .style('top', `${event.clientY - 20}px`);
  tooltip.transition().duration(delay).style('opacity', 0.9);
}

export function highlightSelectedNodes(state: State): void {
  // Set the class of everything to 'muted', except for the selected node and it's neighbors
  select('.nodes')
    .selectAll('.nodeGroup')
    .classed('muted', (n: unknown) => {
      const node = n as Node;
      return (
        Object.keys(state.selected).length > 0
        && !Object.keys(state.selected).includes(node.id)
        && !Array<string>().concat(...Object.values(state.selected)).includes(node.id)
      );
    });

  // Set the class of a clicked node to clicked
  select('.nodes')
    .selectAll('.node')
    .classed('clicked', (n: unknown) => {
      const node = n as Node;
      return Object.keys(state.selected).includes(node.id);
    });
}

export function highlightLinks(state: State): void {
  const linksToHighlight = state.network.links.map((l: Link) => {
    if (l.source.id in state.selected || l.target.id in state.selected) {
      return l.id;
    }
    return '';
  });

  select('.links')
    .selectAll('.linkGroup')
    .classed('muted', (l: unknown) => {
      const link = l as Link;
      return Object.keys(state.selected).length > 0 && !linksToHighlight.includes(link.id);
    });
}

export function drawNested(
  node: Selection<BaseType, Node, BaseType, unknown>,
  nodeMarkerHeight: number,
  nodeMarkerLength: number,
  glyphColorScale: ScaleOrdinal<string, string>,
  barVariables: string[],
  glyphVariables: string[],
  graphStructure: Network,
) {
  // Delete past renders
  node.selectAll('.bar').remove();
  node.selectAll('.glyph').remove();

  // Set some bar specific variables that we'll need for tracking position and sizes
  const barWidth = glyphVariables.length === 0
    ? nodeMarkerLength / barVariables.length
    : (nodeMarkerLength / 2) / barVariables.length;

  barVariables.forEach((barVar, i) => {
    const maxValue: number = max(graphStructure.nodes.map((n: Node) => parseFloat(n[barVar]))) || 1;
    // Draw white, background bar
    node.append('rect')
      .attr('class', 'bar')
      .attr('width', `${barWidth - 10}px`)
      .attr('height', `${nodeMarkerHeight - 16 - 5 - 5}px`)
      .attr('y', `${16 + 5}px`)
      .attr('x', `${5 + (i * barWidth)}px`)
      .style('fill', '#FFFFFF');

    // Draw the color bar with height based on data
    node.append('rect')
      .attr('class', 'bar')
      .attr('width', `${barWidth - 10}px`)
      .attr('height', (d: Node) => `${((nodeMarkerHeight - 16 - 5 - 5) * d[barVar]) / maxValue}px`)
      .attr('y', (d: Node) => `${(nodeMarkerHeight - 5 - ((nodeMarkerHeight - 16 - 5 - 5) * d[barVar]) / maxValue)}px`)
      .attr('x', `${5 + (i * barWidth)}px`)
      .style('fill', '#82b1ff');
  });

  // Append glyphs
  [0, 1].forEach((i) => {
    const glyphVar = glyphVariables[i];
    if (glyphVar === undefined) {
      return;
    }
    // Draw glyph
    node.append('rect')
      .attr('class', 'glyph')
      .attr('width', `${(nodeMarkerLength / 2) - 5 - 5 - 5}px`)
      .attr('height', `${(nodeMarkerHeight / 2) - 5 - 5 - 5}px`)
      .attr('y', `${16 + 5 + (i * ((nodeMarkerHeight / 2) - 5 - 5 - 5)) + 5 * (i)}px`)
      .attr('x', `${5 + ((nodeMarkerLength / 2) - 5 - 5) + 5 + 5}px`)
      .attr('ry', `${((nodeMarkerHeight / 2) - 5 - 5) / 2}px`)
      .attr('rx', `${((nodeMarkerLength / 2) - 5 - 5) / 2}px`)
      .style('fill', (d: Node) => glyphColorScale(d[glyphVar]));
  });
}

export function updateVis(this: any, provenance: Provenance<State, ProvenanceEvents, unknown>): void {
  const state = provenance.current().getState();
  let node = this.svg
    .select('.nodes')
    .selectAll('.nodeGroup')
    .data(this.graphStructure.nodes);

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
    .attr('transform', (d: Node) => {
      // Get the space we have to work with
      const horizontalSpace = this.visDimensions.width - this.visMargins.left
        - this.visMargins.right - (2 * state.nodeMarkerLength);
      const verticalSpace = this.visDimensions.height - this.visMargins.bottom
        - this.visMargins.top - (2 * state.nodeMarkerHeight);
      // If no x,y defined, get a random place in the space we have and bump it over by 1 margin
      d.x = d.x === undefined ? (Math.random() * horizontalSpace) + this.visMargins.left
        : Math.max(
          this.visMargins.left,
          Math.min(this.visDimensions.width - state.nodeMarkerLength - this.visMargins.right, d.x),
        );
      d.y = d.y === undefined ? (Math.random() * verticalSpace) + this.visMargins.top
        : Math.max(
          this.visMargins.top,
          Math.min(this.visDimensions.height - state.nodeMarkerHeight - this.visMargins.bottom, d.y),
        );
      return `translate(${d.x},${d.y})`;
    });

  node
    .selectAll('.nodeBox')
    .attr('width', () => state.nodeMarkerLength)
    .attr('height', () => state.nodeMarkerHeight)
    .attr('rx', this.renderNested ? 0 : state.nodeMarkerLength / 2)
    .attr('ry', this.renderNested ? 0 : state.nodeMarkerHeight / 2);

  node.select('.node')
    .style('fill', (d: Node) => {
      if (this.colorVariable === 'table') {
        const table = d.id.split('/')[0];
        return this.nodeColorScale(table);
      }
      return this.nodeColorScale(d[this.colorVariable]);
    })
    .on('click', (_event: unknown, n: Node) => selectNode(n, provenance))
    .on('mouseover', (event: unknown, d: Node) => {
      this.showTooltip(d.id, event);
    });

  node
    .select('text')
    .text((d: Node) => d[this.labelVariable])
    .style('font-size', `${this.nodeFontSize}pt`)
    .attr('dx', state.nodeMarkerLength / 2)
    .attr('dy', this.renderNested ? 8 : (state.nodeMarkerHeight / 2) + 2);

  node
    .select('.labelBackground')
    .attr('y', () => (this.renderNested ? 0 : (state.nodeMarkerHeight / 2) - 8))
    .attr('width', () => state.nodeMarkerLength)
    .attr('height', '1em');

  if (this.renderNested) {
    drawNested(
      node,
      state.nodeMarkerHeight,
      state.nodeMarkerLength,
      this.glyphColorScale,
      this.barVariables,
      this.glyphVariables,
      this.graphStructure,
    );
  } else {
    node.selectAll('.bar').remove();
    node.selectAll('.glyph').remove();
  }

  node.call(
    drag()
      .on('start', (event, d) => this.dragStarted(d))
      .on('drag', (event, d) => this.dragged(d, event, state)),
    // .on("end", () => this.dragEnded())
  );

  // Draw Links
  const link: Selection<SVGGElement, Link, SVGGElement, unknown> = select<SVGGElement, BaseType>('.links')
    .selectAll<SVGGElement, Link>('.linkGroup')
    .data(this.graphStructure.links);

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

  // Redefining as linkMerge allows for better typing
  const linkMerge = linkEnter.merge(link);

  linkMerge.classed('muted', false);
  linkMerge
    .select('path')
    .style('stroke-width', (d: Link) => (this.linkWidthScale(d[this.widthVariables[0]]) > 0 && this.linkWidthScale(d[this.widthVariables[0]]) < 20
      ? this.linkWidthScale(d[this.widthVariables[0]]) : 1))
    .style('stroke', (d: Link) => {
      if (
        this.colorVariables[0] !== undefined
        && this.linkColorScale.domain().indexOf(d[this.colorVariables[0]].toString()) > -1
      ) {
        return this.linkColorScale(d[this.colorVariables[0]]);
      }
      return '#888888';
    })
    .attr('id', (d: Link) => d._key)
    .attr('d', (d: Link) => arcPath(
      d,
      this.provenance.current().getState(),
      this.visDimensions,
      this.visMargins,
      this.straightEdges,
    ))
    .on('mouseover', (d: Link) => {
      let tooltipData = d.id;
      // Add the width attribute to the tooltip
      if (this.attributes.edgeWidthKey) {
        tooltipData = tooltipData.concat(` [${d[this.attributes.edgeWidthKey]}]`);
      }
      // eslint-disable-next-line no-restricted-globals
      this.showTooltip(tooltipData, event, 400);
    })

    .on('mouseout', () => {
      this.hideTooltip();
    });

  node.on('mouseout', () => {
    this.hideTooltip();
  });

  highlightSelectedNodes(state);
  highlightLinks(state);
}

export function startSimulation(this: any, simulation: Simulation<Node, Link>) {
  // Update the force radii
  simulation.force('collision',
    forceCollide()
      .radius(getForceRadius(this.nodeMarkerLength, this.nodeMarkerHeight, this.renderNested))
      .strength(0.7)
      .iterations(10));

  simulation.alpha(0.5);
  // simulation.alphaTarget(0.02).restart();
}

export function stopSimulation(network: Network, simulation: Simulation<Node, Link>) {
  simulation.stop();
  network.nodes.forEach((n: Node) => {
    n.savedX = n.x;
    n.savedY = n.y;
  });
}

export function releaseNodes(network: Network, simulation: Simulation<Node, Link>) {
  // Release the pinned nodes
  network.nodes.forEach((n: Node) => {
    n.fx = null;
    n.fy = null;
  });
  startSimulation(simulation);
}
