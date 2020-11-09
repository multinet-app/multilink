import { TableRow } from 'multinet';

export interface Dimensions {
  height: number;
  width: number;
}

export interface Link extends TableRow {
  _from: string;
  _to: string;
  [propName: string]: any; // eslint-disable-line  @typescript-eslint/no-explicit-any
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

export interface State {
  network: Network;
  order: number[];
  userSelectedEdges: [];
  selected: { [nodeID: string]: string[] };
  hardSelected: [];
  search: [];
  event: string;
  nodeMarkerLength: number;
  nodeMarkerHeight: number;
}
