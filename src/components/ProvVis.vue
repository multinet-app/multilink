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
    );
  }
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
#provDiv :deep(.secondary) {
  /* Unset vuetify colors for secondary */
  background-color: unset !important;
  border-color: white !important;
}
</style>
