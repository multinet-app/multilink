import { Provenance } from '@visdesignlab/trrack';
import { Simulation } from 'd3-force';
import { ScaleLinear, ScaleOrdinal, ScaleSequential } from 'd3-scale';
import { TableRow, TableMetadata, UserSpec } from 'multinet';

export interface Dimensions {
  height: number;
  width: number;
}

export interface Edge extends TableRow {
  _from: string;
  _to: string;
  [propName: string]: any; // eslint-disable-line  @typescript-eslint/no-explicit-any
}

export interface SimulationEdge extends Edge {
  source: string;
  target: string;
}

export interface Network {
  nodes: Node[];
  edges: Edge[];
}

export interface Node extends TableRow {
  x?: number;
  y?: number;
  [propName: string]: any; // eslint-disable-line  @typescript-eslint/no-explicit-any
}

export interface Cell {
  x: number;
  y: number;
  z: number;
  rowID: string;
  colID: string;
  cellName: string;
  correspondingCell: string;
}

export interface LoadError {
  message: string;
  href: string;
}

export interface NestedVariables {
  bar: string[];
  glyph: string[];
}

export interface EdgeStyleVariables {
  width: string;
  color: string;
}

export interface AttributeRange {
  attr: string;
  min: number;
  max: number;
  binLabels: string[];
  binValues: number[];
  currentMax?: number;
  currentMin?: number;
  currentBinLabels?: string[];
  currentBinValues?: number[];
}

export interface AttributeRanges {
  [key: string]: AttributeRange;
}

export interface NetworkMetadata { [tableName: string]: TableMetadata }

export interface State {
  workspaceName: string | null;
  networkName: string | null;
  network: Network | null;
  networkMetadata: NetworkMetadata | null;
  columnTypes: { [key: string]: string };
  selectedNodes: Set<string>;
  loadError: LoadError;
  displayCharts: boolean;
  markerSize: number;
  fontSize: number;
  labelVariable: string | undefined;
  selectNeighbors: boolean;
  nestedVariables: NestedVariables;
  edgeVariables: EdgeStyleVariables;
  nodeSizeVariable: string;
  nodeColorVariable: string;
  attributeRanges: AttributeRanges;
  simulation: Simulation<Node, SimulationEdge> | null;
  nodeColorScale: ScaleSequential<string> | ScaleOrdinal<string, string>;
  nodeBarColorScale: ScaleOrdinal<string, string>;
  nodeGlyphColorScale: ScaleOrdinal<string, string>;
  edgeWidthScale: ScaleLinear<number, number>;
  edgeColorScale: ScaleSequential<string> | ScaleOrdinal<string, string>;
  provenance: Provenance<State, ProvenanceEventTypes, unknown> | null;
  directionalEdges: boolean;
  controlsWidth: number;
  simulationRunning: boolean;
  showProvenanceVis: boolean;
  rightClickMenu: {
    show: boolean;
    top: number;
    left: number;
  };
  userInfo: UserSpec | null;
  edgeLength: number;
  svgDimensions: Dimensions;
}

export type ProvenanceEventTypes =
  'Select Node(s)' |
  'De-select Node' |
  'Clear Selection' |
  'Set Display Charts' |
  'Set Marker Size' |
  'Set Font Size' |
  'Set Label Variable' |
  'Set Node Color Variable' |
  'Set Node Size Variable' |
  'Set Select Neighbors'|
  'Set Directional Edges' |
  'Set Edge Length';

export const internalFieldNames = ['_from', '_to', '_id', '_rev'] as const;
export type InternalField = (typeof internalFieldNames)[number];
