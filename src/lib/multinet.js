/* Multinet data importer */
import * as d3 from "d3";

async function _loadTables(workspace, graph, apiRoot) {
  const tables_call = apiRoot + "/workspaces/" + workspace + "/graphs/" + graph
  return await d3.json(tables_call);
}

async function _loadNodes(workspace, node_table, apiRoot) {
  const nodes_call = apiRoot + "/workspaces/" + workspace + "/tables/" + node_table + "?limit=1000"
  let nodes_raw = await d3.json(nodes_call)
  return nodes_raw["rows"];
}

async function _loadLinks(workspace, edge_table, apiRoot) {
  const links_call = apiRoot + "/workspaces/" + workspace + "/tables/" + edge_table + "?limit=1000"
  let links_raw = await d3.json(links_call)
  return links_raw["rows"]; 
}

function _renameLinkVars(links) {
  for (let row of links) {
    row.id = row._id;
    row.source = row._from;
    row.target = row._to;

    delete row._id;
    delete row._from;
    delete row._to;
  }
  return links;
}

function _renameNodeVars(nodes) {
  for (let row of nodes) {
    row.id = row._id;
    delete row._id;
  }
  return nodes;
}

async function loadData(workspace, graph, apiRoot = "https://multinet.app/api") {
  // Define local variables that will store the api url and the responses from the database
  let multinet = {
    "tables": {},
    "nodes": [],
    "links": [],
    "graph_structure": {},
  };

  // Fetch the names of all the node and edge tables 
  multinet.tables = await _loadTables(workspace, graph, apiRoot);

  // Loop through each node tables and fetch the nodes to global variables
  for (let node_table of multinet.tables.nodeTables) {
    const nodeTable = await _loadNodes(workspace, node_table, apiRoot);
    multinet.nodes = [].concat(multinet.nodes, nodeTable);
  }

  // Load the edge table (ONLY ONE BECAUSE OF ARANGO API LIMITATIONS)
  // to a global variable
  let edge_table = multinet.tables.edgeTable;
  const linkTable = await _loadLinks(workspace, edge_table, apiRoot);
  multinet.links = [].concat(multinet.links, linkTable);

  // Set the graph structure
  multinet.graph_structure = {
    "nodes": _renameNodeVars(multinet.nodes),
    "links": _renameLinkVars(multinet.links),
  };
  return JSON.parse(JSON.stringify(multinet.graph_structure))
}

export {
  loadData,
};
