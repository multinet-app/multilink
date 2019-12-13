/**
 * This module contains various utilities for
 * creating, updatating, and managing a nodelink graph.
 */
import * as Provenance from 'provenance-lib-core/lib/src/provenance-core/Provenance';

function _nodeLink(provenance) {
  return {
    currentState: () => provenance.graph().current.state
  };
}

//function that initializes the state object for node positions;
function _nodePositionMap(nodes) {
  let nodeMap = {};
  nodes.map(n => nodeMap[n.id] = { x: n.x, y: n.y });
  return nodeMap;
}

function setUpProvenance(nodes, order = 'noOrder') {
  let nodePos = _nodePositionMap(nodes);

  const initialState = {
    order,
    nodePos, //map of node positions, 
    userSelectedNeighbors: [], //map of nodes that have neighbors selected (so they can be non-muted)
    userSelectedEdges: [],
    selected: [], //set of nodes that have been 'soft selected'
    hardSelected: [], //set of nodes that have been 'hard selected'
    search: [], //field to store the id of a searched node;
    startTime: new Date(), //time this provenance graph was created and the task initialized;
    event: 'startedPvenance', //string describing what event triggered this state update; same as the label in provenance.applyAction
    //  endTime:'', // time the submit button was pressed and the task ended;
    time: new Date() //timestamp for the current state of the graph;
  };

  const provenance = Provenance.initProvenance(initialState);
  const app = _nodeLink(provenance);
  return {
    provenance,
    app
  };
}

export {
  setUpProvenance
};
