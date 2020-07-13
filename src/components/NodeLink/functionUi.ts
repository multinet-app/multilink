import { forceCollide } from 'd3-force';
import { getForceRadii } from './functionUpdateVis';
import { select } from 'd3-selection';
import { State, Node, Link } from '@/types';

export function highlightSelectedNodes(state: State): void {
  // Set the class of everything to 'muted', except for the selected node and it's neighbors
  select('.nodes')
    .selectAll('.nodeGroup')
    .classed('muted', (n: Node) => {
      return (
        Object.keys(state.selected).length > 0 &&
        !Object.keys(state.selected).includes(n.id) &&
        !Array<string>().concat(...Object.values(state.selected)).includes(n.id)
      );
    });

  // Set the class of a clicked node to clicked
  select('.nodes')
    .selectAll('.node')
    .classed('clicked', (n: Node) => Object.keys(state.selected).includes(n.id));

  select('.links')
    .selectAll('.linkGroup')
    .classed('muted', (n: Node) => !state.userSelectedEdges.includes(n.id));
}

export function highlightLinks(state: State): void {
  const linksToHighlight = state.network.links.map((l: Link) => {
    if (l.source.id in state.selected || l.target.id in state.selected) {
      return l.id;
    }
  });

  select('.links')
    .selectAll('.linkGroup')
    .classed('muted', (l: Link) => Object.keys(state.selected).length > 0 && !linksToHighlight.includes(l.id));
}

export function releaseNodes() {
  // Release the pinned nodes
  graphStructure.nodes.map((n: Node) => {
    n.fx = null;
    n.fy = null;
  });
  startSimulation();
}

export function startSimulation() {
  // Update the force radii
  this.simulation.force('collision',
    forceCollide()
    .radius(getForceRadii(this.nodeMarkerLength, this.nodeMarkerHeight, this.renderNested))
    .strength(0.7)
    .iterations(10),
  );

  this.simulation.alpha(0.5);
  this.simulation.alphaTarget(0.02).restart();
}

export function stopSimulation() {
  const { simulation, graphStructure } = this;
  simulation.stop();
  graphStructure.nodes.map((n) => {
    n.savedX = n.x;
    n.savedY = n.y;
  });
}
