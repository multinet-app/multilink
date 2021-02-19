<script lang="ts">
import Vue from 'vue';
import Legend from '@/components/Legend.vue';

import store from '@/store';
import { Node, Link, Network } from '@/types';
import { forceCollide, forceManyBody } from 'd3-force';

export default Vue.extend({
  components: {
    Legend,
  },

  data() {
    return {
      searchTerm: '' as string,
      searchErrors: [] as string[],
      linkLength: '50',
    };
  },

  computed: {
    graphStructure() {
      return store.getters.network;
    },

    multiVariableList(): Set<string | null> {
      if (this.graphStructure !== null) {
        // Loop through all nodes, flatten the 2d array, and turn it into a set
        const allVars: Set<string> = new Set();
        this.graphStructure.nodes.map((node: Node) => Object.keys(node).forEach((key) => allVars.add(key)));
        allVars.delete('_id');
        allVars.delete('_rev');
        allVars.delete('vx');
        allVars.delete('vy');
        allVars.delete('x');
        allVars.delete('y');
        allVars.delete('index');
        return allVars;
      }
      return new Set();
    },

    linkVariableList(): Set<string | null> {
      if (this.graphStructure !== null) {
        // Loop through all links, flatten the 2d array, and turn it into a set
        const allVars: Set<string> = new Set();
        this.graphStructure.edges.map((link: Link) => Object.keys(link).forEach((key) => allVars.add(key)));

        allVars.delete('_id');
        allVars.delete('_rev');
        allVars.delete('source');
        allVars.delete('target');
        allVars.delete('index');

        return allVars;
      }
      return new Set();
    },

    displayCharts: {
      get() {
        return store.getters.displayCharts;
      },
      set(value: boolean) {
        return store.commit.setDisplayCharts(value);
      },
    },

    markerSize: {
      get() {
        return store.getters.markerSize || 0;
      },
      set(value: number) {
        store.commit.setMarkerSize({ markerSize: value, updateProv: false });
      },
    },

    fontSize: {
      get() {
        return store.getters.fontSize || 0;
      },
      set(value: number) {
        store.commit.setFontSize({ fontSize: value, updateProv: false });
      },
    },

    labelVariable: {
      get() {
        return store.getters.labelVariable;
      },
      set(value: string) {
        store.commit.setLabelVariable(value);
      },
    },

    selectNeighbors: {
      get() {
        return store.getters.selectNeighbors;
      },
      set(value: boolean) {
        store.commit.setSelectNeighbors(value);
      },
    },

    directionalEdges: {
      get() {
        return store.getters.directionalEdges;
      },
      set(value: boolean) {
        store.commit.setDirectionalEdges(value);
      },
    },

    controlsWidth(): number {
      return store.getters.controlsWidth;
    },

    simulationRunning() {
      return store.getters.simulationRunning;
    },

    network(): Network | null {
      return store.getters.network;
    },

    autocompleteItems(): string[] {
      if (this.network !== null) {
        return this.network.nodes.map((node) => node[this.labelVariable]);
      }
      return [];
    },

    networkMetadata() {
      return store.getters.networkMetadata;
    },
  },

  methods: {
    startSimulation() {
      store.commit.startSimulation();
    },

    stopSimulation() {
      store.commit.stopSimulation();
    },

    releaseNodes() {
      store.dispatch.releaseNodes();
    },

    exportGraph() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(
        new Blob(
          [JSON.stringify(this.graphStructure)],
          { type: 'text/json' },
        ),
      );
      a.download = `${store.getters.networkName || 'unknown_graph'}.json`;
      a.click();
    },

    search() {
      const searchErrors: string[] = [];
      if (this.network !== null) {
        const nodeToSelect = this.network.nodes.find((node) => node[this.labelVariable] === this.searchTerm);

        if (nodeToSelect !== undefined) {
          store.commit.addSelectedNode(nodeToSelect._id);
        } else {
          searchErrors.push('Enter a node to search');
        }
      }

      this.searchErrors = searchErrors;
    },

    updateSliderProv(value: number, type: 'markerSize' | 'fontSize' | 'linkLength') {
      if (type === 'markerSize') {
        store.commit.setMarkerSize({ markerSize: value, updateProv: true });
        store.dispatch.updateSimulationForce({ forceType: 'collision', forceValue: forceCollide((this.markerSize / 2) * 1.5), restart: true });
      } else if (type === 'fontSize') {
        store.commit.setFontSize({ fontSize: value, updateProv: true });
      } else if (type === 'linkLength') {
        // Scale value to between -500, 0
        const newLinkLength = (value * -5);

        store.dispatch.updateSimulationForce({ forceType: 'charge', forceValue: forceManyBody<Node>().strength(newLinkLength), restart: true });
      }
    },

    clearSelection() {
      store.commit.setSelected(new Set());
    },

    toggleProvVis() {
      store.commit.toggleShowProvenanceVis();
    },
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
        <v-toolbar-title class="d-flex align-center">
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
            </v-row>
          </div>
        </v-toolbar-title>
        <v-spacer />
        <!-- login-menu / -->
      </v-toolbar>

      <!-- control panel content -->
      <v-list class="pa-0">
        <v-subheader class="grey darken-3 py-0 white--text">
          Controls
        </v-subheader>

        <div class="pa-4">
          <v-list-item class="px-0">
            <v-autocomplete
              v-model="searchTerm"
              label="Search for Node"
              :items="autocompleteItems"
              :error-messages="searchErrors"
            />

            <v-btn
              class="ml-2"
              color="primary"
              depressed
              small
              @click="search"
            >
              Search
            </v-btn>
          </v-list-item>

          <v-list-item class="px-0">
            <v-select
              v-model="labelVariable"
              label="Label Variable"
              :items="Array.from(multiVariableList)"
              clearable
              outlined
              dense
            />
          </v-list-item>

          <v-list-item class="px-0">
            <v-btn
              color="primary"
              depressed
              small
              block
              @click="clearSelection"
            >
              Clear Selection
            </v-btn>
          </v-list-item>

          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch
                v-model="displayCharts"
                class="ma-0"
                hide-details
              />
            </v-list-item-action>
            <v-list-item-content> Display Charts </v-list-item-content>
          </v-list-item>

          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch
                v-model="directionalEdges"
                class="ma-0"
                hide-details
              />
            </v-list-item-action>
            <v-list-item-content> Directional Edges </v-list-item-content>
          </v-list-item>

          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch
                v-model="selectNeighbors"
                class="ma-0"
                hide-details
              />
            </v-list-item-action>
            <v-list-item-content> Autoselect Neighbors </v-list-item-content>
          </v-list-item>

          <v-card-subtitle class="pb-0 pl-0">
            Marker Size
          </v-card-subtitle>
          <v-slider
            v-model="markerSize"
            :min="10"
            :max="100"
            :label="String(markerSize)"
            inverse-label
            hide-details
            @change="(value) => updateSliderProv(value, 'markerSize')"
          />

          <v-card-subtitle class="pb-0 pl-0">
            Font Size
          </v-card-subtitle>
          <v-slider
            v-model="fontSize"
            :min="6"
            :max="20"
            :label="String(fontSize)"
            inverse-label
            hide-details
            @change="(value) => updateSliderProv(value, 'fontSize')"
          />

          <v-card-subtitle class="pb-0 pl-0">
            Link Length
          </v-card-subtitle>
          <v-slider
            v-model="linkLength"
            :min="0"
            :max="100"
            :label="linkLength.toString()"
            inverse-label
            hide-details
            @change="(value) => updateSliderProv(linkLength, 'linkLength')"
          />

          <v-row>
            <v-col>
              <v-btn
                color="grey darken-3"
                depressed
                text
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
                width="85"
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

          <v-list-item class="px-0">
            <v-btn
              block
              class="ml-0"
              color="grey darken-3 white--text"
              depressed
              @click="exportGraph"
            >
              Export Graph
            </v-btn>
          </v-list-item>

          <v-list-item class="px-0">
            <v-btn
              color="primary"
              block
              depressed
              @click="toggleProvVis"
            >
              Provenance Vis
            </v-btn>
          </v-list-item>
        </div>

        <v-subheader class="grey darken-3 py-0 white--text">
          Legend
        </v-subheader>
        <Legend
          v-if="multiVariableList.has('_key') && networkMetadata"
          ref="legend"
          class="mt-4"
          v-bind="{
            graphStructure,
            multiVariableList,
            linkVariableList,
          }"
        />
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
