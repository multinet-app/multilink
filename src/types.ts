import { Provenance } from '@visdesignlab/trrack';
import { Simulation } from 'd3-force';
import { ScaleLinear, ScaleOrdinal, ScaleSequential } from 'd3-scale';
import { TableRow, TableMetadata, UserSpec } from 'multinet';

export interface Dimensions {
  height: number;
  width: number;
}

export interface Link extends TableRow {
  _from: string;
  _to: string;
  [propName: string]: any; // eslint-disable-line  @typescript-eslint/no-explicit-any
}

export interface SimulationLink extends Link {
  source: string;
  target: string;
}

export interface Network {
  nodes: Node[];
  edges: Link[];
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

export interface LinkStyleVariables {
  width: string;
  color: string;
}

export interface AttributeRanges {
  [key: string]: {attr: string; min: number; max: number; binLabels: string[]; binValues: number[]};
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
  linkVariables: LinkStyleVariables;
  nodeSizeVariable: string;
  nodeColorVariable: string;
  attributeRanges: AttributeRanges;
  simulation: Simulation<Node, SimulationLink> | null;
  nodeBarColorScale: ScaleOrdinal<string, string>;
  nodeGlyphColorScale: ScaleOrdinal<string, string>;
  linkWidthScale: ScaleLinear<number, number>;
  linkColorScale: ScaleSequential<string> | ScaleOrdinal<string, string>;
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
  linkLength: number;
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
  'Set Link Length';

export const internalFieldNames = ['_from', '_to', '_id', '_rev'] as const;
export type InternalField = (typeof internalFieldNames)[number];
