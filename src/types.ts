import { Provenance } from '@visdesignlab/trrack';
import { Simulation } from 'd3-force';
import { ScaleLinear, ScaleOrdinal } from 'd3-scale';
import { TableRow, TableMetadata } from 'multinet';

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
  buttonText: string;
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
  [key: string]: {attr: string; min: number; max: number};
}

export interface NetworkMetadata { [tableName: string]: TableMetadata }

export interface State {
  workspaceName: string | null;
  networkName: string | null;
  network: Network | null;
  networkMetadata: NetworkMetadata | null;
  selectedNodes: Set<string>;
  loadError: LoadError;
  displayCharts: boolean;
  markerSize: number;
  fontSize: number;
  labelVariable: string;
  selectNeighbors: boolean;
  nestedVariables: NestedVariables;
  linkVariables: LinkStyleVariables;
  nodeSizeVariable: string;
  nodeColorVariable: string;
  attributeRanges: AttributeRanges;
  simulation: Simulation<Node, SimulationLink> | null;
  nodeColorScale: ScaleOrdinal<string, string>;
  linkWidthScale: ScaleLinear<number, number>;
  provenance: Provenance<State, ProvenanceEventTypes, unknown> | null;
  directionalEdges: boolean;
  controlsWidth: number;
  simulationRunning: boolean;
  showProvenanceVis: boolean;
}

export type ProvenanceEventTypes =
  'Select Node' |
  'De-select Node' |
  'Clear Selection' |
  'Set Display Charts' |
  'Set Marker Size' |
  'Set Font Size' |
  'Set Label Variable' |
  'Set Node Color Variable' |
  'Set Node Size Variable' |
  'Set Select Neighbors'|
  'Set Directional Edges';
