<script setup lang="ts">
import store from '@/store';
import { getUrlVars } from '@/lib/utils';
import { computed } from 'vue';

import AlertBanner from '@/components/AlertBanner.vue';
import ControlPanel from '@/components/ControlPanel.vue';
import MultiLink from '@/components/MultiLink.vue';
import ProvVis from '@/components/ProvVis.vue';

const urlVars = getUrlVars(); // Takes workspacce and network
store.dispatch.fetchNetwork({
  workspaceName: urlVars.workspace,
  networkName: urlVars.network,
}).then(() => {
  store.dispatch.createProvenance();
  store.dispatch.guessLabel();
});

const network = computed(() => store.state.network);
const selectedNodes = computed(() => store.state.selectedNodes);
const loadError = computed(() => store.state.loadError);

// Provenance vis boolean
const showProvenanceVis = computed(() => store.state.showProvenanceVis);

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
