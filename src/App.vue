<script setup lang="ts">
import store from './store/index';
import { getUrlVars } from './lib/utils';

import AlertBanner from './components/AlertBanner.vue';
import ControlPanel from './components/ControlPanel.vue';
import MultiLink from './components/MultiLink.vue';
import ProvVis from './components/ProvVis.vue';

import 'multinet-components/dist/style.css';

const urlVars = getUrlVars(); // Takes workspace and network
store.dispatch.fetchNetwork({
  workspaceName: urlVars.workspace,
  networkName: urlVars.network,
}).then(() => {
  store.dispatch.createProvenance();
  store.dispatch.guessLabel();
});
</script>

<template>
  <v-app>
    <v-main>
      <control-panel />

      <multi-link
        v-if="store.state.network !== null && store.state.selectedNodes !== null"
      />

      <alert-banner v-if="store.state.loadError.message !== ''" />
    </v-main>

    <prov-vis v-if="store.state.showProvenanceVis" />
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
