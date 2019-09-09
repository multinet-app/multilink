function load_data(workspace, graph) {
    // Fetch the node and edge tables
    url = "http://127.0.0.1:8081/api/workspaces/" + workspace + "/graphs/" + graph + "/nodes"
    console.log(url)
    tables = d3.json(url).then(d => { console.log(d.nodes) })




    // Fetch the nodes
    nodes = 1

    // Fetch the edges
    edges = 1

    return nodes, edges
};