/* Multinet data importer */
import { json } from 'd3-fetch';

async function _loadTables(workspace: string, networkName: string, apiRoot: string) {
  const tablesCall = apiRoot + '/workspaces/' + workspace + '/graphs/' + networkName;
  return await json(tablesCall);
}

async function _loadNodes(workspace: string, nodeTable: string, apiRoot: string) {
  const nodesCall = apiRoot + '/workspaces/' + workspace + '/tables/' + nodeTable + '?limit=1000';
  const nodesRaw = await json(nodesCall);
  return nodesRaw.rows;
}

async function _loadLinks(workspace: string, edgeTable: string, apiRoot: string) {
  const linksCall = apiRoot + '/workspaces/' + workspace + '/tables/' + edgeTable + '?limit=1000';
  const linksRaw = await json(linksCall);
  return linksRaw.rows;
}

function _renameLinkVars(links: any[]) {
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

function _renameNodeVars(nodes: any[]) {
  for (const row of nodes) {
    row.id = row._id;
    delete row._id;
  }
  return nodes;
}

function _defineNeighbors(nodes: any[], links: any[]) {
  nodes.map((d: { neighbors: string[]; }) => d.neighbors = []);
  for (const link of links) {
    nodes.filter((d: { _id: any; }) => d._id === link._from)[0].neighbors.push(link._to);
    nodes.filter((d: { _id: any; }) => d._id === link._to)[0].neighbors.push(link._from);
  }
  return nodes;
}

export async function loadData(
  workspace: string,
  networkName: string,
  apiRoot: string = 'https://api.multinet.app/api',
) {
  // Define local variables that will store the api url and the responses from the database
  const multinet: {tables: any, nodes: any[], links: any[], network: any} = {
    tables: {nodeTables: [], edgeTable: ''},
    nodes: Array(),
    links: [],
    network: {},
  };

  // Fetch the names of all the node and edge tables
  multinet.tables = await _loadTables(workspace, networkName, apiRoot);

  // Loop through each node tables and fetch the nodes to global variables
  for (const nodeTable of multinet.tables.nodeTables) {
    const ntable = await _loadNodes(workspace, nodeTable, apiRoot);
    multinet.nodes = multinet.nodes.concat(ntable);
  }

  // Load the edge table (ONLY ONE BECAUSE OF ARANGO API LIMITATIONS)
  // to a global variable
  const table = multinet.tables.edgeTable;
  const linkTable = await _loadLinks(workspace, table, apiRoot);
  multinet.links = multinet.links.concat(linkTable);

  // Define neighbors
  multinet.nodes = _defineNeighbors(multinet.nodes, multinet.links);

  // Set the network
  multinet.network = {
    nodes: _renameNodeVars(multinet.nodes),
    links: _renameLinkVars(multinet.links),
  };
  return JSON.parse(JSON.stringify(multinet.network));
}

