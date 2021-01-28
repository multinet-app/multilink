import { ProvenanceEventTypes, State } from '@/types';
import { createAction } from '@visdesignlab/trrack';

export function updateProvenanceState(vuexState: State, label: ProvenanceEventTypes) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateUpdateActions = createAction<State, any[], ProvenanceEventTypes>((provState, newProvState) => {
    if (label === 'Select Node' || label === 'De-select Node' || label === 'Clear Selection') {
      // TODO: #148 remove cast back to set
      // eslint-disable-next-line no-param-reassign, @typescript-eslint/no-explicit-any
      provState.selectedNodes = [...newProvState.selectedNodes] as any;
    } else if (label === 'Set Display Charts') {
      // eslint-disable-next-line no-param-reassign
      provState.displayCharts = newProvState.displayCharts;
    } else if (label === 'Set Marker Size') {
      // eslint-disable-next-line no-param-reassign
      provState.markerSize = newProvState.markerSize;
    } else if (label === 'Set Font Size') {
      // eslint-disable-next-line no-param-reassign
      provState.fontSize = newProvState.fontSize;
    } else if (label === 'Set Label Variable') {
      // eslint-disable-next-line no-param-reassign
      provState.labelVariable = newProvState.labelVariable;
    } else if (label === 'Set Color Variable') {
      // eslint-disable-next-line no-param-reassign
      provState.colorVariable = newProvState.colorVariable;
    } else if (label === 'Set Select Neighbors') {
      // eslint-disable-next-line no-param-reassign
      provState.selectNeighbors = newProvState.selectNeighbors;
    } else if (label === 'Set Directional Edges') {
      // eslint-disable-next-line no-param-reassign
      provState.directionalEdges = newProvState.directionalEdges;
    }
  })
    .setLabel(label);

  if (vuexState.provenance !== null) {
    vuexState.provenance.apply(stateUpdateActions(vuexState));
  }
}

export function undoRedoKeyHandler(event: KeyboardEvent, storeState: State) {
  // If provenance doesn't exist, exit
  if (storeState.provenance == null) { return; }

  if (
    (event.ctrlKey && event.code === 'KeyZ' && !event.shiftKey) // ctrl + z (no shift)
    || (event.metaKey && event.code === 'KeyZ' && !event.shiftKey) // meta + z (no shift)
  ) {
    if (storeState.provenance.current.id !== storeState.provenance.root.id) {
      storeState.provenance.undo();
    }
  } else if (
    (event.ctrlKey && event.code === 'KeyY') // ctrl + y
    || (event.ctrlKey && event.code === 'KeyZ' && event.shiftKey) // ctrl + shift + z
    || (event.metaKey && event.code === 'KeyY') // meta + y
    || (event.metaKey && event.code === 'KeyZ' && event.shiftKey) // meta + shift + z
  ) {
    if (storeState.provenance.current.children.length > 0) {
      storeState.provenance.redo();
    }
  }
}
