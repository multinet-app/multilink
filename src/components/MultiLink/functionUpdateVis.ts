import {
  Selection, select, selectAll, BaseType,
} from 'd3-selection';
import { max } from 'd3-array';
import { ScaleOrdinal } from 'd3-scale';
// eslint-disable-next-line import/no-cycle
import { selectNode, ProvenanceEvents } from '@/lib/provenance';
import {
  Node, State, Link, Network, Dimensions,
} from '@/types';
import { Provenance } from '@visdesignlab/trrack';

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
