/* Multinet data importer */
import { multinetApi } from 'multinet';
import { Node, Network, Link } from '@/types';

async function _downloadAllRows(api: any, workspace: string, tableName: string, tableType: 'node' | 'link') {
  let table = await api.table(workspace, tableName, { offset: 0, limit: 100 });

  // If the table is large, don't download the data
  if (
    (table.count > 100 && tableType === 'node') ||
    (table.count > 2000 && tableType === 'link')
  ) {
    throw new Error(`The table called ${tableName} is too large, not downloading.`);
  }

  // Else if the table is small enough, grab the previously
  // acquired data and make requests for the remaining data
  let output: any[] = [];
  output = output.concat(table.rows);

  while (output.length < table.count) {
    table  = await api.table(workspace, tableName, { offset: output.length, limit: 100 });
    output = output.concat(table.rows);
  }

  return output;
}

function _renameLinkVars(links: any[]): Link[] {
  for (const row of links) {
    row.id = row._id;
    row.source = row._from;
    row.target = row._to;

    delete row._id;
    delete row._from;
    delete row._to;
  }
  return links;
}

function _renameNodeVars(nodes: any[]): Node[] {
  for (const row of nodes) {
    row.id = row._id;
    delete row._id;
  }
  return nodes;
}

function _defineNeighbors(nodes: any[], links: any[]) {
  nodes.map((d: { neighbors: string[]; }) => d.neighbors = []);
  for (const link of links) {
    nodes.filter((d: Node) => d._id === link._from)[0].neighbors.push(link._to);
    nodes.filter((d: Node) => d._id === link._to)[0].neighbors.push(link._from);
  }
  return nodes;
}

export async function loadData(
  workspace: string,
  networkName: string,
  apiRoot: string = 'https://api.multinet.app/api',
): Promise<Network> {
  // Define local variables that will store the api url and the responses from the database
  const multinet: {tables: { nodeTables: string[], edgeTable: string}, nodes: any[], links: any[], network: Network} = {
    tables: {nodeTables: [], edgeTable: ''},
    nodes: Array(),
    links: [],
    network: {nodes: [], links: []},
  };

  const api = multinetApi(apiRoot);

  // Fetch the names of all the node and edge tables
  multinet.tables = await api.graph(workspace, networkName);

  // Loop through each node tables and fetch the nodes
  for (const tableName of multinet.tables.nodeTables) {
    multinet.nodes = multinet.nodes.concat(await _downloadAllRows(api, workspace, tableName, 'node'));
  }

  // Load the link table
  multinet.links = await _downloadAllRows(api, workspace, multinet.tables.edgeTable, 'link');

  // Define neighbors
  multinet.nodes = _defineNeighbors(multinet.nodes, multinet.links);

  // Set the network
  multinet.network = {
    nodes: _renameNodeVars(multinet.nodes),
    links: _renameLinkVars(multinet.links),
  };

  return multinet.network;
}
