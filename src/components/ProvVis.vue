<script lang="ts">
import Vue from 'vue';
import { ProvVisCreator } from '@visdesignlab/trrack-vis';
import { ProvenanceEventTypes, State } from '@/types';
import { computed, ComputedRef, onMounted } from '@vue/composition-api';
import store from '@/store';
import { Provenance } from '@visdesignlab/trrack';

export default Vue.extend({
  setup() {
    const provenance: ComputedRef<Provenance<State, ProvenanceEventTypes, unknown> | null> = computed(
      () => store.getters.provenance,
    );

    onMounted(() => {
      const provDiv = document.getElementById('provDiv');
      if (provenance.value !== null && provDiv != null) {
        ProvVisCreator(
          provDiv,
          provenance.value,
          (newNode: string) => provenance.value?.goToNode(newNode),
          true,
          true,
          provenance.value.root.id,
        );
      }
    });

    return { };
  },
});
</script>

<template>
  <v-card>
    <div id="provDiv" />
  </v-card>
</template>

<style scoped>

</style>
