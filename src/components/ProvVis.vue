<script lang="ts">
import { ProvVisCreator } from '@visdesignlab/trrack-vis';
import { ProvenanceEventTypes, State } from '@/types';
import {
  computed, ComputedRef, defineComponent, onMounted,
} from 'vue';
import store from '@/store';
import { Provenance } from '@visdesignlab/trrack';

export default defineComponent({
  setup() {
    const provenance: ComputedRef<Provenance<State, ProvenanceEventTypes, unknown> | null> = computed(
      () => store.state.provenance,
    );

    onMounted(() => {
      const provDiv = document.getElementById('provDiv');
      if (provenance.value !== null && provDiv != null) {
        ProvVisCreator(
          provDiv,
          provenance.value,
          (newNode: string) => store.commit.goToProvenanceNode(newNode),
          true,
          true,
          provenance.value.root.id,
        );
      }
    });

    function toggleProvVis() {
      store.commit.toggleShowProvenanceVis();
    }

    return { toggleProvVis };
  },
});
</script>

<template>
  <v-navigation-drawer
    absolute
    permanent
    right
    :width="450"
  >
    <v-btn
      icon
      class="ma-2"
      @click="toggleProvVis"
    >
      <v-icon>mdi-close</v-icon>
    </v-btn>

    <div id="provDiv" />
  </v-navigation-drawer>
</template>

<style scoped>
#provDiv >>> .secondary {
  /* Unset vuetify colors for secondary */
  background-color: unset !important;
  border-color: white !important;
}
</style>
