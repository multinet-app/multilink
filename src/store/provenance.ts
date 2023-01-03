import { findDifferencesInPrimitiveStates, isArray } from '@/lib/provenanceUtils';
import { ProvState } from '@/types';
import { initializeTrrack, Registry } from '@trrack/core';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

export const useProvenanceStore = defineStore('provenance', () => {
  // Initial values (only primitives, any more complicated value should be derived from primitives in the main store)
  const selectNeighbors = ref(true);
  const displayCharts = ref(false);
  const directionalEdges = ref(false);
  const selectedNodes = ref<string[]>([]);

  // A live computed state so that we can edit the values when trrack does undo/redo
  const currentPiniaState = computed(() => ({
    selectNeighbors,
    displayCharts,
    directionalEdges,
    selectedNodes,
  }));

  // Static snapshot of the initial state for trrack
  function getPiniaStateSnapshot() {
    const piniaSnapshot: { [key: string]: unknown } = {};
    Object.entries(currentPiniaState.value).forEach(([key, value]) => {
      // Need to unpack array refs, because there is some interaction between vue and trrack proxies
      if (isArray(value.value)) {
        piniaSnapshot[key] = [...value.value];
      } else {
        piniaSnapshot[key] = value.value;
      }
    });
    return piniaSnapshot as unknown as ProvState;
  }
  const initialState = getPiniaStateSnapshot();

  // Provenance set up
  const registry = Registry.create();
  const updateTrrack = registry.register('Update Trrack', (trrackState, piniaState: ProvState) => {
    Object.entries(piniaState).forEach(([key, value]) => { trrackState[key] = value; });
  });
  const provenance = initializeTrrack({
    initialState,
    registry,
  });

  // When the vue state changes, update trrack
  watch(
    currentPiniaState,
    () => {
      // TODO: Find which element changed to set a user friendly label, current label is 'State Changed'

      // Update the provenance state if the vue state has diverged
      const piniaSnapshot = getPiniaStateSnapshot();
      if (Object.entries(findDifferencesInPrimitiveStates(provenance.getState(), piniaSnapshot)).length !== 0) {
        provenance.apply('State Changed', updateTrrack(piniaSnapshot));
      }
    },
    { deep: true }, // deep: true is required because the computed is an object
  );

  // When the trrack state changes (undo/redo), update vue
  provenance.currentChange(() => {
    const updates = findDifferencesInPrimitiveStates(getPiniaStateSnapshot(), provenance.getState());
    Object.entries(updates).forEach(([key, val]) => { currentPiniaState.value[key as keyof ProvState].value = val; });
  });

  return {
    provenance,
    selectNeighbors,
    displayCharts,
    directionalEdges,
    selectedNodes,
  };
});
