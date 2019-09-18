/* Multinet data importer */

// Define global variables that store data
let tables;
let nodes = [];
let links = [];
let graph_structure;


async function load_data(workspace, graph) {
    // Fetch the node and edge tables
    tables_call = "http://multinet.app/api/workspaces/" + workspace + "/graphs/" + graph
    await load_tables(tables_call)

    // Loop through each node table and fetch the nodes to global variables
    for (node_table of tables.nodeTables) {
        nodes_call = "http://multinet.app/api/workspaces/" + workspace + "/tables/" + node_table
        await load_nodes(nodes_call)
    }

    // Load the edge table to a global variable
    edge_table = tables.edgeTable
    links_call = "http://multinet.app/api/workspaces/" + workspace + "/tables/" + edge_table
    await load_links(links_call)

    // Set the global graph structure
    graph_structure = { "nodes": nodes, "links": links }

};


async function load_tables(call) {
    tables = await d3.json(call);
};


async function load_nodes(call) {
    let table;
    table = await d3.json(call);
    nodes = [].concat(nodes, table)
};


async function load_links(call) {
    let table;
    table = await d3.json(call);
    links = [].concat(links, table)
};