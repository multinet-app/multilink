<script setup lang="ts">
import 'multinet-components/dist/style.css';
import { storeToRefs } from 'pinia';
import { useStore } from '@/store';
import { getUrlVars } from './lib/utils';

import AlertBanner from '@/components/AlertBanner.vue';
import ControlPanel from '@/components/ControlPanel.vue';
import MultiLink from '@/components/MultiLink.vue';
import ProvVis from '@/components/ProvVis.vue';



const store = useStore();
const {
  network,
  selectedNodes,
  loadError,
  showProvenanceVis,
} = storeToRefs(store);

const urlVars = getUrlVars(); // Takes workspace and network
store.fetchNetwork(
  urlVars.workspace,
  urlVars.network,
).then(() => {
  store.createProvenance();
  store.guessLabel();
});
</script>

<template>
  <v-app>
    <v-main>
      <control-panel />

      <multi-link
        v-if="network !== null && selectedNodes !== null"
      />

      <alert-banner v-if="loadError.message !== ''" />
    </v-main>

    <prov-vis v-if="showProvenanceVis" />
  </v-app>
</template>

<style>
html {
  scrollbar-width: none;
}

html::-webkit-scrollbar {
  display: none;
}

body {
  overflow: hidden;
}

#app {
  font-family: "Blinker", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: none;
}

.v-btn__content {
  padding-bottom: 2px;
}

.v-input__append-outer {
  margin-left: 0 !important;
}
</style>
