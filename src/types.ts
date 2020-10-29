export interface Dimensions {
  height: number;
  width: number;
}

export interface Link {
  _key: string;
  id: string;
  source: Node;
  target: Node;
  [propName: string]: any; // eslint-disable-line  @typescript-eslint/no-explicit-any
}

export interface Network {
  nodes: Node[];
  links: Link[];
}

export interface Node {
  _key: string;
  id: string;
  neighbors: string[];
  x: number;
  y: number;
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
