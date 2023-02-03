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
    :width="145 + 190"
  >
    <v-btn
      icon
      class="ma-2"
      @click="store.showProvenanceVis = !store.showProvenanceVis"
    >
      <v-icon>mdi-close</v-icon>
    </v-btn>

    <v-row class="ml-2 mt-1">
      <v-btn @click="provenance.undo()">
        undo
      </v-btn>
      <v-btn @click="provenance.redo()">
        redo
      </v-btn>
    </v-row>

    <div
      id="provDiv"
      ref="provDiv"
    />
  </v-navigation-drawer>
</template>

<style scoped>

</style>
