<script lang="ts">
import Vue from 'vue';
import Legend from '@/components/MultiLink/Legend.vue';

import store from '@/store';

import { scaleLinear, scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

export default Vue.extend({
  components: {
    Legend,
  },

  data() {
    return {
      nodeMarkerSize: 50,
      nodeFontSize: 14,
      workspace: null,
      graph: null,
      selectNeighbors: true,
      renderNested: false,
      labelVariable: '_key',
      colorVariable: null,
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

        allVars.delete('_from');
        allVars.delete('_to');
        allVars.delete('source');
        allVars.delete('target');

        return allVars;
      }
      return new Set();
    },
  },

  methods: {
    startSimulation() {
      store.original.commit('startSimulation');
    },

    stopSimulation() {
      store.original.commit('stopSimulation');
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
      a.download = 'graph.json';
      a.click();
    },

  },
});
</script>

<template>
  <v-container
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
          v-model="nodeMarkerSize"
          :min="10"
          :max="100"
          :label="String(nodeMarkerSize)"
          inverse-label
          hide-details
        />

        <v-divider class="mt-4" />

        <v-card-subtitle class="pb-0 pl-0">
          Font Size
        </v-card-subtitle>
        <v-slider
          v-model="nodeFontSize"
          :min="10"
          :max="30"
          :label="String(nodeFontSize)"
          inverse-label
          hide-details
        />

        <v-divider class="mt-4" />

        <v-select
          v-model="labelVariable"
          label="Label Variable"
          :items="[...variableList]"
          :options="[...variableList]"
        />

        <v-divider class="mt-4" />

        <v-select
          v-model="colorVariable"
          label="Color Variable"
          :items="[...colorVariableList]"
          :options="[...colorVariableList]"
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
  #control {
    max-height: calc(33vh - 18px);
    overflow-y: scroll
  }
</style>
