import { ProvenanceEventTypes, State } from '@/types';
import { createAction } from '@visdesignlab/trrack';

export function updateProvenanceState(vuexState: State, label: ProvenanceEventTypes) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateUpdateActions = createAction<State, any[], ProvenanceEventTypes>((provState, newProvState) => {
    if (label === 'Select Node' || label === 'De-select Node') {
      // TODO: #148 remove cast back to set
      // eslint-disable-next-line no-param-reassign, @typescript-eslint/no-explicit-any
      provState.selectedNodes = [...newProvState.selectedNodes] as any;
    }
  })
    .setLabel(label);

  if (vuexState.provenance !== null) {
    vuexState.provenance.apply(stateUpdateActions(vuexState));
  }
}
