<script lang="ts">
import Vue from 'vue';
import Legend from '@/components/MultiLink/Legend.vue';

import store from '@/store';
import { Node, Link } from '@/types';

export default Vue.extend({
  components: {
    Legend,
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

    variableList(): Set<string | null> {
      return this.multiVariableList.add(null);
    },

    colorVariableList(): Set<string | null> {
      return this.variableList.add('table');
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

    renderNested: {
      get() {
        return store.getters.renderNested;
      },
      set(value: boolean) {
        return store.commit.setRenderNested(value);
      },
    },

    markerSize: {
      get() {
        return store.getters.markerSize || 0;
      },
      set(value: number) {
        store.commit.setMarkerSize(value);
      },
    },

    fontSize: {
      get() {
        return store.getters.fontSize || 0;
      },
      set(value: number) {
        store.commit.setFontSize(value);
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

    colorVariable: {
      get() {
        return store.getters.colorVariable;
      },
      set(value: string) {
        store.commit.setColorVariable(value);
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
            <v-select
              v-model="labelVariable"
              label="Label Variable"
              :items="Array.from(variableList)"
              multiple
              outlined
              chips
              dense
              deletable-chips
              small-chips
              persistent-hint
            />
          </v-list-item>

          <v-list-item class="px-0">
            <v-select
              v-model="colorVariable"
              label="Color Variable"
              :items="Array.from(colorVariableList)"
              multiple
              outlined
              chips
              dense
              deletable-chips
              small-chips
              persistent-hint
            />
          </v-list-item>

          <v-list-item class="px-0">
            <v-list-item-action class="mr-3">
              <v-switch
                v-model="renderNested"
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
          />

          <v-row>
            <v-col cols="5">
              <v-btn
                class="px-2"
                color="grey darken-3"
                depressed
                text
                small
                @click="releaseNodes"
              >
                <v-icon small>
                  mdi-pin-off
                </v-icon>
                Release
              </v-btn>
            </v-col>

            <v-col
              cols="3"
              class="px-0"
            >
              <v-btn
                class="ml-2 px-1"
                color="primary"
                depressed
                small
                @click="startSimulation"
              >
                <v-icon small>
                  mdi-play
                </v-icon>
                Start
              </v-btn>
            </v-col>

            <v-col
              cols="3"
              class="px-0"
            >
              <v-btn
                class="ml-4 px-1"
                color="primary"
                depressed
                small
                @click="stopSimulation"
              >
                <v-icon small>
                  mdi-stop
                </v-icon>
                Stop
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
        </div>

        <v-subheader class="grey darken-3 py-0 white--text">
          Legend
        </v-subheader>
        <Legend
          v-if="multiVariableList.has('_key')"
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
