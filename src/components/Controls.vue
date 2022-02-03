<script lang="ts">
import Legend from '@/components/Legend.vue';
import AboutDialog from '@/components/AboutDialog.vue';
import LoginMenu from '@/components/LoginMenu.vue';

import store from '@/store';
import { Node, internalFieldNames } from '@/types';
import {
  computed, defineComponent, Ref, ref,
} from '@vue/composition-api';

export default defineComponent({
  components: {
    Legend,
    AboutDialog,
    LoginMenu,
  },

  setup() {
    const searchTerm = ref('');
    const searchErrors: Ref<string[]> = ref([]);
    const showMenu = ref(false);
    const network = computed(() => store.state.network);

    const multiVariableList = computed(() => {
      if (network.value !== null) {
        // Loop through all nodes, flatten the 2d array, and turn it into a set
        const allVars: Set<string> = new Set();
        network.value.nodes.forEach((node: Node) => Object.keys(node).forEach((key) => allVars.add(key)));

        internalFieldNames.forEach((field) => allVars.delete(field));
        allVars.delete('vx');
        allVars.delete('vy');
        allVars.delete('x');
        allVars.delete('y');
        allVars.delete('index');
        return allVars;
      }
      return new Set();
    });

    const displayCharts = computed({
      get() {
        return store.state.displayCharts;
      },
      set(value: boolean) {
        return store.commit.setDisplayCharts(value);
      },
    });

    const layoutVars = computed(() => store.state.layoutVars);
    const markerSize = computed({
      get() {
        return store.state.markerSize || 0;
      },
      set(value: number) {
        store.commit.setMarkerSize({ markerSize: value, updateProv: false });
      },
    });

    const fontSize = computed({
      get() {
        return store.state.fontSize || 0;
      },
      set(value: number) {
        store.commit.setFontSize({ fontSize: value, updateProv: false });
      },
    });

    const labelVariable = computed({
      get() {
        return store.state.labelVariable;
      },
      set(value: string | undefined) {
        store.commit.setLabelVariable(value);
      },
    });

    const selectNeighbors = computed({
      get() {
        return store.state.selectNeighbors;
      },
      set(value: boolean) {
        store.commit.setSelectNeighbors(value);
      },
    });

    const directionalEdges = computed({
      get() {
        return store.state.directionalEdges;
      },
      set(value: boolean) {
        store.commit.setDirectionalEdges(value);
      },
    });

    const edgeLength = computed({
      get() {
        return store.state.edgeLength;
      },
      set(value: number) {
        store.commit.setEdgeLength({ edgeLength: value, updateProv: false });
      },
    });

    const controlsWidth = computed(() => store.state.controlsWidth);
    const simulationRunning = computed(() => store.state.simulationRunning);
    const columnTypes = computed(() => store.state.columnTypes);
    const autocompleteItems = computed(() => {
      if (network.value !== null && labelVariable.value !== undefined) {
        return network.value.nodes.map((node) => (node[labelVariable.value || '']));
      }
      return [];
    });

    function startSimulation() {
      store.commit.startSimulation();
    }

    function stopSimulation() {
      store.commit.stopSimulation();
    }

    function releaseNodes() {
      store.dispatch.releaseNodes();
    }

    function exportNetwork() {
      if (network.value === null) {
        return;
      }

      const networkToExport = {
        nodes: network.value.nodes.map((node) => {
          const newNode = { ...node };
          newNode.id = newNode._key;
          delete newNode._key;

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
      a.download = `${store.state.networkName}.json`;
      a.click();
    }

    function search() {
      searchErrors.value = [];
      if (network.value !== null) {
        const nodeIDsToSelect = network.value.nodes
          .filter((node) => (labelVariable.value !== undefined ? node[labelVariable.value] === searchTerm.value : false))
          .map((node) => node._id);

        if (nodeIDsToSelect.length > 0) {
          store.commit.addSelectedNode(nodeIDsToSelect);
        } else {
          searchErrors.value.push('Enter a valid node to search');
        }
      }
    }

    function updateSliderProv(value: number, type: 'markerSize' | 'fontSize' | 'edgeLength') {
      if (type === 'markerSize') {
        store.commit.setMarkerSize({ markerSize: value, updateProv: true });
      } else if (type === 'fontSize') {
        store.commit.setFontSize({ fontSize: value, updateProv: true });
      } else if (type === 'edgeLength') {
        store.commit.setEdgeLength({ edgeLength: value, updateProv: true });
      }
    }

    function toggleProvVis() {
      store.commit.toggleShowProvenanceVis();
    }

    return {
      searchTerm,
      searchErrors,
      showMenu,
      displayCharts,
      columnTypes,
      search,
      autocompleteItems,
      controlsWidth,
      multiVariableList,
      markerSize,
      fontSize,
      toggleProvVis,
      updateSliderProv,
      exportNetwork,
      startSimulation,
      stopSimulation,
      releaseNodes,
      simulationRunning,
      labelVariable,
      selectNeighbors,
      directionalEdges,
      edgeLength,
      layoutVars,
    };
  },
});
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
        <login-menu />
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
          class="pb-4 pt-2"
        >
          <v-list-item>
            <v-select
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

          <v-card-subtitle class="pb-0">
            Marker Size
          </v-card-subtitle>
          <v-slider
            v-model="markerSize"
            :disabled="layoutVars.x !== null || layoutVars.y !== null"
            :min="10"
            :max="100"
            :label="String(markerSize)"
            class="px-2"
            inverse-label
            hide-details
            color="blue darken-1"
            @change="(value) => updateSliderProv(value, 'markerSize')"
          />

          <v-card-subtitle class="pb-0">
            Font Size
          </v-card-subtitle>
          <v-slider
            v-model="fontSize"
            :disabled="!labelVariable"
            :min="6"
            :max="20"
            :label="String(fontSize)"
            class="px-2"
            inverse-label
            hide-details
            color="blue darken-1"
            @change="(value) => updateSliderProv(value, 'fontSize')"
          />

          <v-card-subtitle class="pb-0">
            Edge Length
          </v-card-subtitle>
          <v-slider
            v-model="edgeLength"
            :disabled="layoutVars.x !== null || layoutVars.y !== null"
            :min="0"
            :max="100"
            :label="edgeLength.toString()"
            class="px-2"
            inverse-label
            hide-details
            color="blue darken-1"
            @change="(value) => updateSliderProv(edgeLength, 'edgeLength')"
          />

          <v-row class="px-4 pt-4 pb-1">
            <v-col>
              <v-btn
                color="grey darken-2"
                depressed
                small
                @click="releaseNodes"
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
                @click="simulationRunning ? stopSimulation() : startSimulation()"
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
              @click="toggleProvVis"
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

        <v-subheader class="grey darken-3 py-0 white--text">
          Legend

          <v-spacer />

          <v-switch
            v-model="displayCharts"
            append-icon="mdi-chart-bar"
            class="mr-0"
            dense
            dark
            color="blue darken-1"
          />
        </v-subheader>
        <Legend v-if="columnTypes !== null" />
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
