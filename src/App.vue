<script setup lang="ts">
import 'multinet-components/dist/style.css';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useStore } from '@/store';
import { undoRedoKeyHandler } from '@/lib/provenanceUtils';
import oauthClient from '@/oauth';

import { ToolBar } from 'multinet-components';

import AlertBanner from '@/components/AlertBanner.vue';
import ControlPanel from '@/components/ControlPanel.vue';
import MultiLink from '@/components/MultiLink.vue';
import ProvVis from '@/components/ProvVis.vue';
import { useDebounceFn } from '@vueuse/core';
import { isInternalField } from './lib/typeUtils';

const store = useStore();
const {
  network,
  loadError,
  showProvenanceVis,
  selectedNodes,
  labelVariable,
  userInfo,
  snackBarMessage,
} = storeToRefs(store);

store.fetchNetwork();

// Set up provenance undo and redo, provenance is not a ref here
const { provenance } = store;
document.addEventListener('keydown', (event) => undoRedoKeyHandler(event, provenance));

const showControlPanel = ref(false);

const searchItems = computed(() => {
  if (labelVariable.value !== undefined) {
    const allCombinations = network.value.nodes.map((node) => Object.entries(node).map(([key, value]) => (isInternalField(key) ? null : ({ text: `${key}: ${value}`, value: { [key]: value } })))).flat();
    return [...new Map(allCombinations.filter((combo) => combo !== null).map((combo) => [combo?.text, combo])).values()];
  }
  return [];
});

function search(searchTerm: Record<string, unknown>) {
  const nodeIDsToSelect = network.value.nodes
    .filter((node) => Object.entries(searchTerm).every(([key, value]) => node[key] === value))
    .map((node) => node._id);

  if (nodeIDsToSelect.length > 0) {
    selectedNodes.value.push(...nodeIDsToSelect);
  }
}

function exportNetwork() {
  const networkToExport = {
    nodes: network.value.nodes.map((node) => {
      const newNode = { ...node };
      newNode.id = newNode._key;

      return newNode;
    }),
    edges: network.value.edges.map((edge) => {
      const newEdge = { ...edge };
      newEdge.source = `${edge._from.split('/')[1]}`;
      newEdge.target = `${edge._to.split('/')[1]}`;
      return newEdge;
    }),
  };

  const a = document.createElement('a');
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(networkToExport)], {
      type: 'text/json',
    }),
  );
  a.download = `${store.networkName}.json`;
  a.click();
}

const snackBarTimeout = 3000;
const showSnackBar = ref(false);
const clearMessage = useDebounceFn(() => {
  snackBarMessage.value = '';
}, snackBarTimeout);
watch(snackBarMessage, () => {
  showSnackBar.value = snackBarMessage.value !== '';
  clearMessage();
});
</script>

<template>
  <v-app>
    <v-main>
      <tool-bar
        app-name="MultiLink"
        :clear-selection="() => selectedNodes = []"
        :prov-undo="() => provenance.undo()"
        :prov-redo="() => provenance.redo()"
        :search="search"
        :search-items="searchItems"
        :export-network="exportNetwork"
        :show-trrack-vis="() => showProvenanceVis = true"
        :toggle-side-bar="() => showControlPanel = !showControlPanel"
        :user-info="userInfo"
        :oauth-client="oauthClient"
        :logout="store.logout"
        :fetch-user-info="store.fetchUserInfo"
      />

      <control-panel v-show="showControlPanel" />

      <multi-link v-if="network.nodes.length > 0" :show-control-panel="showControlPanel" />

      <alert-banner v-if="loadError.message !== ''" />

      <v-snackbar
        v-model="showSnackBar"
        color="primary"
        text
        elevation="6"
      >
        {{ snackBarMessage }}

        <template #actions>
          <v-btn
            color="blue"
            variant="text"
            @click="showSnackBar = false"
          >
            Close
          </v-btn>
        </template>
      </v-snackbar>
    </v-main>

    <prov-vis v-if="showProvenanceVis" />
  </v-app>
</template>

<style>

html, body {
  overflow-y: hidden;
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
