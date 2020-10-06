/**
 * This module contains various utilities for
 * creating, updating, and managing a nodelink graph.
 */
import { initProvenance, Provenance } from '@visdesignlab/trrack';
import { Node, State, Network } from '@/types';
import { highlightSelectedNodes, highlightLinks } from '@/components/NodeLink/functionUpdateVis';

export type ProvenanceEvents = 'Selected Node' | 'Dragged Node'

export function setUpProvenance(network: Network): Provenance<State, ProvenanceEvents, unknown> {
  const initialState: State = {
    network,
    order: [],
    userSelectedEdges: [],
    selected: {},
    hardSelected: [],
    search: [],
    event: 'startedProvenance',
    nodeMarkerLength: 50,
    nodeMarkerHeight: 50,
  };

  const provenance = initProvenance<State, ProvenanceEvents, unknown>(initialState, false);

  provenance.addObserver(['selected'], (state: State | undefined) => {
    if (state) {
      // Update the UI
      highlightSelectedNodes(state);
      highlightLinks(state);
    } else {
      throw new Error('The state is not defined. Cannot highlight nodes.');
    }
  });

  return provenance;
}

// Check the state to see if the node is selected
export function isSelected(node: Node, currentState: State) {
  return Object.keys(currentState.selected).includes(node.id);
}

export function selectNode(node: Node, provenance: Provenance<State, ProvenanceEvents, unknown>): void {
  const action = provenance.addAction(
    'select node',
    (currentState: State) => {
      if (isSelected(node, currentState)) {
        delete currentState.selected[node.id];
      } else {
        currentState.selected[node.id] = node.neighbors;
      }
      return currentState;
    },
  );

  action
    .addEventType('Selected Node')
    .alwaysStoreState(true)
    .applyAction();
}

export function redo(provenance: Provenance<State, ProvenanceEvents, unknown>): void {
  if (provenance.current().children.length > 0) {
    provenance.goForwardOneStep();
  }
}

export function undo(provenance: Provenance<State, ProvenanceEvents, unknown>): void {
  if ('parent' in provenance.current()) {
    provenance.goBackOneStep();
  }
}
