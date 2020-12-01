<script lang="ts">
import Vue from 'vue';
import Legend from '@/components/MultiLink/Legend.vue';

import store from '@/store';

import { scaleLinear, scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { Node, Link } from '@/types';

export default Vue.extend({
  components: {
    Legend,
  },

  data() {
    return {
      workspace: null,
      graph: null,
      nodeColorScale: scaleOrdinal(schemeCategory10),
      linkColorScale: scaleOrdinal().range(schemeCategory10),
      glyphColorScale: scaleOrdinal(schemeCategory10),
      nodeAttrScales: {},
      barVariables: [],
      glyphVariables: [],
      widthVariables: [],
      colorVariables: [],
      linkWidthScale: scaleLinear().domain([0, 10]).range([2, 20]),
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
  <v-container
    id="sidebar"
    fluid
    class="pt-0 pb-0"
  >
    <!-- control panel content -->
    <v-card id="control">
      <v-card-title class="pb-6">
        MultiNet Node Link Controls
      </v-card-title>

      <v-card-text>
        <v-card-subtitle
          class="pb-0 pl-0"
          style="display: flex; align-items: center; justify-content: space-between"
        >
          Display charts
          <v-switch
            v-model="renderNested"
            class="ma-0"
            hide-details
          />
        </v-card-subtitle>

        <v-divider class="mt-4" />

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

        <v-divider class="mt-4" />

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

        <v-divider class="mt-4" />

        <v-select
          v-model="labelVariable"
          label="Label Variable"
          :items="Array.from(variableList)"
          :options="Array.from(variableList)"
        />

        <v-divider class="mt-4" />

        <v-select
          v-model="colorVariable"
          label="Color Variable"
          :items="Array.from(colorVariableList)"
          :options="Array.from(colorVariableList)"
        />

        <v-divider class="mt-4" />

        <v-card-subtitle
          class="pb-0 px-0"
          style="display: flex; align-items: center; justify-content: space-between"
        >
          Autoselect neighbors
          <v-switch
            v-model="selectNeighbors"
            class="ma-0"
            hide-details
          />
        </v-card-subtitle>
      </v-card-text>

      <v-card-actions>
        <v-btn
          small
          @click="startSimulation"
        >
          Start Simulation
        </v-btn>
      </v-card-actions>

      <v-card-actions>
        <v-btn
          small
          @click="stopSimulation"
        >
          Stop Simulation
        </v-btn>
      </v-card-actions>

      <v-card-actions>
        <v-btn
          small
          @click="releaseNodes"
        >
          Release Pinned Nodes
        </v-btn>
      </v-card-actions>

      <v-card-actions>
        <v-btn
          small
          @click="exportGraph"
        >
          Export Graph
        </v-btn>
      </v-card-actions>
    </v-card>

    <Legend
      v-if="multiVariableList.has('_key')"
      ref="legend"
      class="mt-4"
      v-bind="{
        graphStructure,
        nodeColorScale,
        linkColorScale,
        glyphColorScale,
        linkWidthScale,
        multiVariableList,
        linkVariableList,
        nodeAttrScales,
        barVariables,
        glyphVariables,
        widthVariables,
        colorVariables,
      }"
    />
  </v-container>
</template>

<style scoped>
  #sidebar {
    min-height: calc(100vh - 55px);
  }

  #control {
    max-height: calc(33vh - 18px);
    overflow-y: scroll
  }
</style>
