/* Multinet data importer */

// Define local variables that will store the api url and the responses from the database
let multinet = {
    "tables": {},
    "nodes": [],
    "links": [],
    "graph_structure": {},
    "api_root": "https://multinet.app/api"
};


async function load_data(workspace, graph) {
    // Fetch the names of all the node and edge tables 
    await load_tables(workspace, graph);

    // Loop through each node tables and fetch the nodes to global variables
    for (let node_table of multinet.tables.nodeTables) {
        await load_nodes(workspace, node_table);
    };

    // Load the edge table (ONLY ONE BECAUSE OF ARANGO API LIMITATIONS) to a global variable
    let edge_table = multinet.tables.edgeTable;
    await load_links(workspace, edge_table);

    // Set the graph structure
    multinet.graph_structure = { "nodes": rename_node_vars(multinet.nodes), "links": rename_link_vars(multinet.links) }

    return JSON.parse(JSON.stringify(multinet.graph_structure))

};


async function load_tables(workspace, graph) {
    var tables_call = multinet.api_root + "/workspaces/" + workspace + "/graphs/" + graph
    multinet.tables = await d3.json(tables_call);
};


async function load_nodes(workspace, node_table) {
    nodes_call = multinet.api_root + "/workspaces/" + workspace + "/tables/" + node_table
    table = await d3.json(nodes_call);
    multinet.nodes = [].concat(multinet.nodes, table)
};


async function load_links(workspace, edge_table) {
    links_call = multinet.api_root + "/workspaces/" + workspace + "/tables/" + edge_table
    table = await d3.json(links_call);
    multinet.links = [].concat(multinet.links, table)
};

function rename_link_vars(links) {
    for (row of links) {
        row.id = row._id;
        row.source = row._from;
        row.target = row._to;

        delete row._id;
        delete row._from;
        delete row._to;
    };

    return links;
}

function rename_node_vars(nodes) {
    for (row of nodes) {
        row.id = row._id;

        delete row._id;
    };

    return nodes;
}