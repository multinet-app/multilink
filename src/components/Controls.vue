<script lang="ts">
import Legend from '@/components/MultiLink/Legend.vue';

import store from '@/store';

import { scaleLinear, scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

export default {
  components: {
    Legend,
  },

  data() {
    return {
      graphStructure: {
        nodes: [],
        links: [],
      },
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
    variableList() {
      return this.multiVariableList.concat([null]);
    },
    multiVariableList() {
      if (typeof this.graphStructure.nodes[0] !== 'undefined') {
        // Loop through all nodes, flatten the 2d array, and turn it into a set
        let allVars = this.graphStructure.nodes.map((node) => Object.keys(node));
        allVars = [].concat(...allVars);
        allVars = [...new Set(allVars)];
        return allVars;
      }
      return [];
    },
    colorVariableList() {
      return this.multiVariableList.concat(['table', null]);
    },
    linkVariableList() {
      if (typeof this.graphStructure.links[0] !== 'undefined') {
        // Loop through all links, flatten the 2d array, and turn it into a set
        let allVars = this.graphStructure.links.map((node) => Object.keys(node));
        allVars = [].concat(...allVars);
        allVars = [...new Set(allVars)].filter((d) => d !== 'source' && d !== 'target');
        return allVars;
      }
      return [];
    },
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
};
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
          :items="variableList"
          :options="variableList"
        />

        <v-divider class="mt-4" />

        <v-select
          v-model="colorVariable"
          label="Color Variable"
          :items="colorVariableList"
          :options="colorVariableList"
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
