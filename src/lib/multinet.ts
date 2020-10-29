/* Multinet data importer */
import { multinetApi, RowsSpec } from 'multinet';
import { Node, Network, Link } from '@/types';
import { DataTooBigError } from '@/lib/errors';

const ROWS_TO_PULL = 100;

async function _downloadAllRows(
  // MultinetAPI not exported from multinetjs
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  api: any,
  workspace: string,
  tableName: string,
  tableType: 'node' | 'link',
) {
  let table = await api.table(workspace, tableName, { offset: 0, limit: ROWS_TO_PULL });
  const numberOfRows = table.count;

  // If the table is large, don't download the data
  if (
    (numberOfRows > 100 && tableType === 'node')
    || (numberOfRows > 2000 && tableType === 'link')
  ) {
    throw new DataTooBigError(`The table called ${tableName} is too large, not downloading.`);
  }

  const tables: Array<Promise<RowsSpec>> = [];
  tables.push(table);

  while (tables.length < (numberOfRows / ROWS_TO_PULL) + 1) {
    table = api.table(workspace, tableName, { offset: (tables.length * ROWS_TO_PULL), limit: ROWS_TO_PULL });
    tables.push(table);
  }

  const resolvedPromises = await Promise.all(tables);

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  let output: any[] = [];
  resolvedPromises.forEach((resolved) => {
    output = output.concat(resolved.rows);
  });

  return output;
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
function _renameLinkVars(links: any[]): Link[] {
  links.forEach((row) => {
    row.id = row._id;
    row.source = row._from;
    row.target = row._to;

    delete row._id;
    delete row._from;
    delete row._to;
  });

  return links;
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
function _renameNodeVars(nodes: any[]): Node[] {
  nodes.forEach((row) => {
    row.id = row._id;
    delete row._id;
  });

  return nodes;
}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
function _defineNeighbors(nodes: any[], links: any[]) {
  nodes.forEach((d: { neighbors: string[] }) => { d.neighbors = []; });

  links.forEach((link) => {
    nodes.filter((d: Node) => d._id === link._from)[0].neighbors.push(link._to);
    nodes.filter((d: Node) => d._id === link._to)[0].neighbors.push(link._from);
  });
  return nodes;
}

export async function loadData(
  workspace: string,
  networkName: string,
  apiRoot: string = process.env.VUE_APP_MULTINET_HOST,
): Promise<Network> {
  // Define local variables that will store the api url and the responses from the database
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const multinet: {tables: { nodeTables: string[]; edgeTable: string}; nodes: any[]; links: any[]; network: Network} = {
    tables: { nodeTables: [], edgeTable: '' },
    nodes: [],
    links: [],
    network: { nodes: [], links: [] },
  };

  const api = multinetApi(apiRoot);

  // Fetch the names of all the node and edge tables
  multinet.tables = await api.graph(workspace, networkName);

  // Loop through each node table and fetch the nodes
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const promiseArray: Array<Promise<any>> = [];
  multinet.tables.nodeTables.forEach((tableName) => {
    promiseArray.push(_downloadAllRows(api, workspace, tableName, 'node'));
  });

  const resolvedPromises = await Promise.all(promiseArray);

  resolvedPromises.forEach((resolved) => {
    multinet.nodes.push(...resolved);
  });

  // Load the link table
  multinet.links = await _downloadAllRows(
    api,
    workspace,
    multinet.tables.edgeTable,
    'link',
  );

  // Define neighbors
  multinet.nodes = _defineNeighbors(multinet.nodes, multinet.links);

  // Set the network
  multinet.network = {
    nodes: _renameNodeVars(multinet.nodes),
    links: _renameLinkVars(multinet.links),
  };

  return multinet.network;
}
