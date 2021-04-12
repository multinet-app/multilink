<script lang="ts">
import Vue from 'vue';
import Legend from '@/components/Legend.vue';

import store from '@/store';
import {
  Node, Link, Network, internalFieldNames,
} from '@/types';
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
      showTabs: false,
      tab: undefined,
    };
  },

  computed: {
    multiVariableList(): Set<string | null> {
      if (this.network !== null) {
        // Loop through all nodes, flatten the 2d array, and turn it into a set
        const allVars: Set<string> = new Set();
        this.network.nodes.forEach((node: Node) => Object.keys(node).forEach((key) => allVars.add(key)));

        internalFieldNames.forEach((field) => allVars.delete(field));
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
      if (this.network !== null) {
        // Loop through all links, flatten the 2d array, and turn it into a set
        const allVars: Set<string> = new Set();
        this.network.edges.map((link: Link) => Object.keys(link).forEach((key) => allVars.add(key)));

        internalFieldNames.forEach((field) => allVars.delete(field));
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
      get(): string | undefined {
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
      if (this.network !== null && this.labelVariable !== undefined) {
        return this.network.nodes.map((node) => (node[this.labelVariable || '']));
      }
      return [];
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

    exportNetwork() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(
        new Blob(
          [JSON.stringify(this.network)],
          { type: 'text/json' },
        ),
      );
      a.download = `${store.getters.networkName || 'unknown_network'}.json`;
      a.click();
    },

    search() {
      const searchErrors: string[] = [];
      if (this.network !== null) {
        const nodeIDsToSelect = this.network.nodes
          .filter((node) => (this.labelVariable !== undefined ? node[this.labelVariable] === this.searchTerm : false))
          .map((node) => node._id);

        if (nodeIDsToSelect.length > 0) {
          store.commit.addSelectedNode(nodeIDsToSelect);
        } else {
          searchErrors.push('Enter a valid node to search');
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
            </v-row>
          </div>
        </v-toolbar-title>
        <v-spacer />
        <!-- login-menu / -->
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
            :class="showTabs? `grey darken-2 pa-0` : `grey darken-3 pa-0`"
            @click="showTabs = !showTabs"
          >
            <v-icon color="white">
              mdi-cog
            </v-icon>
          </v-btn>
        </v-subheader>

        <v-tabs
          v-if="showTabs"
          v-model="tab"
          background-color="grey darken-2"
          dark
          grow
          slider-color="blue darken-1"
        >
          <v-tab>
            Visualization
          </v-tab>
          <v-tab>
            Advanced
          </v-tab>
        </v-tabs>

        <v-tabs-items
          v-if="showTabs"
          v-model="tab"
          dark
        >
          <v-tab-item>
            <v-card
              flat
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

              <v-row class="px-4">
                <v-col class="pt-0">
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
                <v-col class="pt-0">
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
            </v-card>
          </v-tab-item>

          <v-tab-item>
            <v-card
              flat
              color="grey darken-3"
              class="pb-4 pt-2"
            >
              <v-card-subtitle class="pb-0">
                Marker Size
              </v-card-subtitle>
              <v-slider
                v-model="markerSize"
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
                Link Length
              </v-card-subtitle>
              <v-slider
                v-model="linkLength"
                :min="0"
                :max="100"
                :label="linkLength.toString()"
                class="px-2"
                inverse-label
                hide-details
                color="blue darken-1"
                @change="(value) => updateSliderProv(linkLength, 'linkLength')"
              />

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
          </v-tab-item>
        </v-tabs-items>

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
        </v-subheader>
        <Legend
          v-if="network !== null"
          ref="legend"
          class="mt-4"
          v-bind="{
            network,
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
