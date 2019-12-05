//function that checks the state to see if the node is selected
function isSelected(node) {
  const currentState = this.app.currentState();
  let selected = currentState.selected;
  return selected.includes(node.id);
}

function highlightSelectedNodes(state) {
  // see if there is at least one node 'clicked'
  //check state not ui, since ui has not yet been updated
  let hasUserSelection = state.selected.length > 0;

  //set the class of everything to 'muted', except for the selected node and it's neighbors
  this.svg
    .select(".nodes")
    .selectAll(".nodeGroup")
    .classed("muted", d => {
      return (
        hasUserSelection &&
        !state.selected.includes(d.id) &&
        !state.userSelectedNeighbors.includes(d.id) //this id exists in the dict
      );
    });

  // Set the class of a clicked node to clicked
  this.svg
    .select(".nodes")
    .selectAll(".node")
    .classed("clicked", d => state.selected.includes(d.id));

  this.svg
    .select(".links")
    .selectAll(".linkGroup")
    .classed(
      "muted",
      d => hasUserSelection && !state.userSelectedEdges.includes(d.id)
    )
    .select("path")
    .style("stroke", this.edgeColor);
}

function tagNeighbors(selected) {
  const { simOn, selectNeighbors, graphStructure } = this;
  let neighbors = [];
  let edges = []

  if (!selectNeighbors) {
    return { "neighbors": neighbors, "edges": edges }
  }

  for (const clickedNode of selected) {
    let neighborNodes;
    if (!simOn) {
      neighborNodes = graphStructure.links
        .map((e, i) => e.source === clickedNode
          ? [e.target, graphStructure.links[i].id]
          : e.target === clickedNode ? [e.source, graphStructure.links[i].id] : "")
    } else {
      neighborNodes = graphStructure.links
        .map((e, i) => e.source.id === clickedNode
          ? [e.target.id, graphStructure.links[i].id]
          : e.target.id === clickedNode ? [e.source.id, graphStructure.links[i].id] : "")
    }

    for (const node of neighborNodes) {
      // push nodes
      if (node[0] !== "" && neighbors.indexOf(node[0]) === -1) {
        neighbors.push(node[0]);
      }

      // push edges
      if (node[1] !== "" && edges.indexOf(node[1]) === -1) {
        edges.push(node[1]);
      }
    }
  }

  return { "neighbors": neighbors, "edges": edges };
}

//function that updates the state, and includes a flag for when this was done through a search
function nodeClick(node, search = false) {
  const { app, provenance } = this;

  const currentState = app.currentState();
  let selected = currentState.selected;
  let wasSelected = this.isSelected(node);

  if (wasSelected) {
    selected = selected.filter(s => s !== node.id);
  } else {
    selected.push(node.id);
  }

  let neighbors_and_edges = this.tagNeighbors(selected);

  let label = search ?
    "Searched for Node" :
    wasSelected ?
      "Unselect Node" :
      "Select Node";

  let action = {
    label: label,
    action: () => {
      const currentState = app.currentState();
      //add time stamp to the state graph
      currentState.time = Date.now();
      //Add label describing what the event was
      currentState.event = label;
      //Update actual node data
      currentState.selected = selected;
      currentState.userSelectedNeighbors = neighbors_and_edges.neighbors;
      currentState.userSelectedEdges = neighbors_and_edges.edges;
      //If node was searched, push him to the search array
      if (search) {
        currentState.search.push(node.id);
      }
      return currentState;
    },
    args: []
  };

  provenance.applyAction(action);
}

export {
  highlightSelectedNodes,
  isSelected,
  nodeClick,
  tagNeighbors,
}
