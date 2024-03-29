import { TableRow } from 'multinet';

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

export interface Node extends TableRow {
  x?: number;
  y?: number;
  [propName: string]: any; // eslint-disable-line  @typescript-eslint/no-explicit-any
}

export interface Network {
  nodes: Node[];
  edges: Edge[];
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
  currentMax?: number;
  currentMin?: number;
  currentBinLabels?: string[];
}

export interface AttributeRanges {
  [key: string]: AttributeRange;
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

export interface ProvState {
  selectNeighbors: boolean;
  displayCharts: boolean;
  directionalEdges: boolean;
  selectedNodes: string[];
  nestedVariables: NestedVariables;
  labelVariable: string | null;
  edgeVariables: EdgeStyleVariables;
  nodeSizeVariable: string;
  nodeColorVariable: string;
  layoutVars: { x: string | null; y: string | null };
  markerSize: number;
  fontSize: number;
  edgeLength: number;
}

export const internalFieldNames = ['_key', '_from', '_to', '_id', '_rev', 'fx', 'fy', 'x', 'y', 'vx', 'vy', 'index'] as const;
export type InternalField = (typeof internalFieldNames)[number];
