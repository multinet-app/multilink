<script setup lang="ts">
import { LoginMenu } from 'multinet-components';
import { computed, ref } from 'vue';
import LegendPanel from '@/components/LegendPanel.vue';
import AboutDialog from '@/components/AboutDialog.vue';

import { useStore } from '@/store';
import { internalFieldNames } from '@/types';
import oauthClient from '@/oauth';
import { storeToRefs } from 'pinia';

const store = useStore();
const {
  displayCharts,
  layoutVars,
  fontSize,
  labelVariable,
  selectNeighbors,
  directionalEdges,
  edgeLength,
  controlsWidth,
  simulationRunning,
  columnTypes,
  network,
  selectedNodes,
  userInfo,
} = storeToRefs(store);

const searchTerm = ref('');
const searchErrors = ref<string[]>([]);
const showMenu = ref(false);

const multiVariableList = computed(() => {
  // Loop through all nodes, flatten the 2d array, and turn it into a set
  const allVars: Set<string> = new Set();
  network.value.nodes.forEach((node) => Object.keys(node).forEach((key) => allVars.add(key)));

  internalFieldNames.forEach((field) => allVars.delete(field));
  allVars.delete('vx');
  allVars.delete('vy');
  allVars.delete('x');
  allVars.delete('y');
  allVars.delete('index');
  return allVars;
});

const markerSize = computed({
  get() {
    return store.markerSize || 0;
  },
  set(value: number) {
    store.setMarkerSize(value, false);
  },
});
const autocompleteItems = computed(() => {
  if (labelVariable.value !== undefined) {
    return network.value.nodes.map((node) => (node[labelVariable.value || '']));
  }
  return [];
});

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

function search() {
  searchErrors.value = [];
  const nodeIDsToSelect = network.value.nodes
    .filter((node) => (labelVariable.value !== undefined ? node[labelVariable.value] === searchTerm.value : false))
    .map((node) => node._id);

  if (nodeIDsToSelect.length > 0) {
    selectedNodes.value.push(...nodeIDsToSelect);
  } else {
    searchErrors.value.push('Enter a valid node to search');
  }
}

function updateSliderProv(value: number, type: 'markerSize' | 'fontSize' | 'edgeLength') {
  if (type === 'markerSize') {
    store.setMarkerSize(value, true);
  } else if (type === 'fontSize') {
    fontSize.value = value;
  } else if (type === 'edgeLength') {
    store.setEdgeLength(value, true);
  }
}
</script>

<template>
  <div>
    <v-navigation-drawer
      app
      class="app-sidebar"
      fixed
      permanent
      stateless
      value="true"
      :width="controlsWidth"
    >
      <v-toolbar color="grey lighten-2">
        <v-toolbar-title
          class="d-flex align-center"
          flat
        >
          <div>
            <v-row class="mx-0 align-center">
              <v-col class="pb-0 pt-2 px-0">
                <img
                  class="app-logo"
                  src="../assets/logo/app_logo.svg"
                  alt="Multinet"
                  width="100%"
                >
              </v-col>
              <v-col class="text-left">
                MultiLink
              </v-col>
              <v-col class="pa-0">
                <about-dialog />
              </v-col>
            </v-row>
          </div>
        </v-toolbar-title>
        <v-spacer />
        <login-menu
          :user-info="userInfo"
          :oauth-client="oauthClient"
          :logout="store.logout"
          :fetch-user-info="store.fetchUserInfo"
        />
      </v-toolbar>

      <!-- control panel content -->
      <v-list class="pa-0">
        <v-subheader class="grey darken-3 py-0 pr-0 white--text">
          Visualization Options

          <v-spacer />

          <v-btn
            :min-width="40"
            :height="48"
            depressed
            tile
            class="grey darken-3 pa-0"
            @click="showMenu = !showMenu"
          >
            <v-icon color="white">
              {{ showMenu ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
            </v-icon>
          </v-btn>
        </v-subheader>

        <v-card
          v-if="showMenu"
          dark
          flat
          tile
          color="grey darken-3"
          class="pb-4 pt-0"
        >
          <v-list-item>
            <v-autocomplete
              v-model="labelVariable"
              label="Label Variable"
              :items="Array.from(multiVariableList)"
              :hide-details="true"
              class="mt-3"
              clearable
              outlined
              dense
            />
          </v-list-item>
          <v-list-item>
            <v-list-item-content> Display Charts </v-list-item-content>
            <v-list-item-action>
              <v-switch
                v-model="displayCharts"
                hide-details
                color="blue darken-1"
              />
            </v-list-item-action>
          </v-list-item>

          <v-list-item>
            <v-list-item-content> Directional Edges </v-list-item-content>
            <v-list-item-action>
              <v-switch
                v-model="directionalEdges"
                hide-details
                color="blue darken-1"
              />
            </v-list-item-action>
          </v-list-item>

          <v-list-item>
            <v-list-item-content> Autoselect Neighbors </v-list-item-content>
            <v-list-item-action>
              <v-switch
                v-model="selectNeighbors"
                hide-details
                color="blue darken-1"
              />
            </v-list-item-action>
          </v-list-item>

          <v-list-item>
            <v-list-item-content> Marker Size </v-list-item-content>
            <v-slider
              v-model="markerSize"
              :disabled="layoutVars.x !== null || layoutVars.y !== null"
              :min="10"
              :max="100"
              hide-details
              color="blue darken-1"
              @change="(value) => updateSliderProv(value, 'markerSize')"
            />
          </v-list-item>

          <v-list-item>
            <v-list-item-content> Font Size </v-list-item-content>
            <v-slider
              v-model="fontSize"
              :disabled="!labelVariable"
              :min="6"
              :max="20"
              hide-details
              color="blue darken-1"
              @change="(value) => updateSliderProv(value, 'fontSize')"
            />
          </v-list-item>

          <v-list-item>
            <v-list-item-content> Edge Length </v-list-item-content>
            <v-slider
              v-model="edgeLength"
              :disabled="layoutVars.x !== null || layoutVars.y !== null"
              :min="0"
              :max="100"
              hide-details
              color="blue darken-1"
              @change="(value) => updateSliderProv(edgeLength, 'edgeLength')"
            />
          </v-list-item>

          <v-row class="px-4 pt-4 pb-1">
            <v-col>
              <v-btn
                color="grey darken-2"
                depressed
                small
                @click="store.releaseNodes()"
              >
                <v-icon
                  left
                  small
                >
                  mdi-pin-off
                </v-icon>
                Release
              </v-btn>
            </v-col>
            <v-spacer />
            <v-col>
              <v-btn
                color="primary"
                depressed
                small
                width="75"
                @click="simulationRunning ? store.stopSimulation() : store.startSimulation()"
              >
                <v-icon
                  left
                  small
                >
                  {{ simulationRunning ? 'mdi-stop' : 'mdi-play' }}
                </v-icon>
                {{ simulationRunning ? 'Stop' : 'Start' }}
              </v-btn>
            </v-col>
          </v-row>

          <v-list-item>
            <v-btn
              color="primary"
              block
              depressed
              @click="store.showProvenanceVis = true"
            >
              Provenance Vis
            </v-btn>
          </v-list-item>

          <v-list-item>
            <v-btn
              block
              color="grey darken-2 white--text"
              depressed
              @click="exportNetwork"
            >
              Export Network
            </v-btn>
          </v-list-item>
        </v-card>

        <div class="px-4">
          <v-list-item class="px-0">
            <v-autocomplete
              v-model="searchTerm"
              label="Search for Node"
              :items="autocompleteItems"
              :error-messages="searchErrors"
              no-data-text="Select a label variable"
              class="pt-4"
              auto-select-first
              outlined
              dense
              @input="search"
            />
          </v-list-item>
        </div>

        <legend-panel v-if="columnTypes !== null" />
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<style scoped>
.app-logo {
  width: 36px;
}

.v-icon {
  padding-top: 2px;
}
</style>
