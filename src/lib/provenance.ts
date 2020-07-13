/**
 * This module contains various utilities for
 * creating, updating, and managing a nodelink graph.
 */
import { initProvenance, Provenance } from '@visdesignlab/provenance-lib-core';
import { Node, State, Network } from '@/types';
import { highlightSelectedNodes, highlightLinks } from '@/components/NodeLink/functionUi';


export function setUpProvenance(network: Network): Provenance<State, any, any> {
  const initialState: State = {
    network,
    order: [],
    userSelectedEdges: [],
    selected: {},
    hardSelected: [],
    search: [],
    event: 'startedProvenance',
  };

  const provenance =  initProvenance(initialState);

  provenance.addObserver(['selected'], function _func(state: State | undefined) {
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
