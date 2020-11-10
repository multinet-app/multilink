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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export function getForceRadius(nodeMarkerLength: number, nodeMarkerHeight: number, renderNested: boolean) {
  if (renderNested) {
    const radius = max([nodeMarkerLength, nodeMarkerHeight]) || 0;
    return radius * 0.8;
  }
  const radius = max([nodeMarkerLength / 2, nodeMarkerHeight / 2]) || 0;
  return radius * 1.5;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
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
