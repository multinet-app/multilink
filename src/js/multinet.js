// Define global variables that store data
let tables;
let nodes = [];
let edges = [];
let graph_structure;

async function load_data(workspace, graph) {
    // Fetch the node and edge tables
    tables_call = "http://127.0.0.1:8080/api/workspaces/" + workspace + "/graphs/" + graph
    await load_tables(tables_call)

    // Loop through each node table and fetch the nodes to global variables
    for (node_table of tables.nodeTables) {
        nodes_call = "http://127.0.0.1:8080/api/workspaces/" + workspace + "/tables/" + node_table
        await load_nodes(nodes_call)
    }

    // Load the edge table to a global variable
    edge_table = tables.edgeTable
    edges_call = "http://127.0.0.1:8080/api/workspaces/" + workspace + "/tables/" + edge_table
    await load_edges(edges_call)

    // Set the global graph structure
    graph_structure = { "nodes": nodes, "edges": edges }

    // Draw the graph
    await loadNewGraph(graph_structure)

};

async function load_tables(call) {
    tables = await d3.json(call);
};

async function load_nodes(call) {
    let table;
    table = await d3.json(call);
    nodes = [].concat(nodes, table)
    console.log(nodes)
};

async function load_edges(call) {
    let table;
    table = await d3.json(call);
    edges = [].concat(edges, table)
    console.log(edges)
};