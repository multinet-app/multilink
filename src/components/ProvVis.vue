<script setup lang="ts">
import { ProvVisCreator } from '@trrack/vis-react';
import { onMounted, ref } from 'vue';
import { useStore } from '@/store';
import { storeToRefs } from 'pinia';

const store = useStore();
const { provenance } = storeToRefs(store);

const provDiv = ref();

onMounted(() => {
  if (provenance.value !== null && provDiv.value != null) {
    ProvVisCreator(
      provDiv.value,
      provenance.value,
      {},
    );
  }
});
</script>

<template>
  <v-navigation-drawer
    id="prov-vis"
    permanent
    right
    :width="145 + 190"
  >
    <v-btn
      icon
      class="ma-2"
      @click="store.showProvenanceVis = !store.showProvenanceVis"
    >
      <v-icon>mdi-close</v-icon>
    </v-btn>

    <div
      id="provDiv"
      ref="provDiv"
    />
  </v-navigation-drawer>
</template>

<style scoped>
#prov-vis {
  position: absolute;
  top: 48px !important;
  height: calc(100% - 48px) !important;
}
</style>
