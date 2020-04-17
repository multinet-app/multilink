<script>
import NodeLink from '@/components/NodeLink/NodeLink.vue';
import Legend from '@/components/NodeLink/Legend.vue';

import { setUpProvenance } from "@/lib/provenance";
import { getUrlVars } from "@/lib/utils";
import { loadData } from "@/lib/multinet";

import * as d3 from "d3";

export default {
  components: {
    NodeLink,
    Legend,
  },

  data() {
    return {
      app: null,
      provenance: null,
      graphStructure: {
        nodes: [],
        links: []
      },
      nodeMarkerSize: 50,
      nodeMarkerType: "Circle",
      nodeFontSize: 14,
      workspace: null,
      graph: null,
      selectNeighbors: true,
      renderNested: false,
      labelVariable: "_key",
      colorVariable: null,
      barVariables: [],
      glyphVariables: [],
      widthVariables: [],
      colorVariables: [],
    };
  },

  computed: {
    nodeAttrs() {
      return this.getAttrNames("node")
    },

    linkAttrs() {
      return this.getAttrNames("link")
    },

    nodeAttrScales() {
      const scales = this.getAttrScales("node");
      scales['table'] = d3.scaleOrdinal(d3.schemeCategory10);
      return scales;
    },

    linkAttrScales() {
      const scales = this.getAttrScales("link");
      scales['width'] = d3.scaleLinear().domain([0, 10]).range([2, 20]);
      return scales;
    },
  },

  async mounted() {
    const { workspace, graph, host } = getUrlVars();
    if (!workspace || !graph) {
      throw new Error(
        `Workspace and graph must be set! workspace=${workspace} graph=${graph}`
      );
    }
    this.graphStructure = await loadData(workspace, graph, host);
    const { provenance, app } = setUpProvenance(this.graphStructure.nodes);
    this.app = app;
    this.provenance = provenance;
    this.workspace = workspace;
    this.graph = graph;
  },

  methods: {
    startSimulation() {
      this.$refs.nodelink.startSimulation();
    },

    stopSimulation() {
      this.$refs.nodelink.stopSimulation();
    },

    releaseNodes() {
      this.$refs.nodelink.releaseNodes();
    },

    exportGraph() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(this.graphStructure)], {
        type: `text/json`
      }));
      a.download = "graph.json";
      a.click();
    },

    getAttrNames(type) {
      if (this.graphStructure[`${type}s`].length > 0) {
        // Loop through all nodes, flatten the 2d array of keys for each node, and turn it into a set
        let allVars = this.graphStructure[`${type}s`].map((d) => Object.keys(d))
        allVars = [].concat.apply([], allVars);
        allVars = [...new Set(allVars)]
        return allVars
      } else {
        return []
      }
    },

    getAttrScales(type) {
      // Set up the scales dict and add width and color scales
      const scales = {};
      console.log(this.nodeMarkerSize, this)

      // Iterate through attrs making linear or ordinal scales based on variable type
      for (const attr of this[`${type}Attrs`]) {
        scales[attr] = this.isQuantitative(attr, type) ? 
          d3.scaleLinear().domain([0, 10]).range([0, this.nodeMarkerSize - 16 - 5 - 5]) :
          d3.scaleOrdinal(d3.schemeCategory10) ;
      }

      return scales
    },

    isQuantitative(attr, type) {
      const uniqueValues = [...new Set(this.graphStructure[`${type}s`].map((d) => parseFloat(d[attr])))];
      return uniqueValues.length > 5;
    }
  },
};
</script>

<template>
  <v-container fluid class="pt-0 pb-0">
    <v-row class="flex-nowrap">
      <!-- control panel content -->
      <v-col cols="3">
        <v-card id="control">
          <v-card-title class="pb-6">MultiNet Node Link Controls</v-card-title>

          <v-card-text>
            <v-card-subtitle class="pb-0 pl-0">Marker Type</v-card-subtitle>
            <v-radio-group v-model="nodeMarkerType">
              <v-radio name="active" label="Circle" value="Circle" @click="renderNested = false; nodeMarkerType = 'Circle'"></v-radio>
              <v-radio name="active" label="Rectangle" value="Rectangle"></v-radio>                
            </v-radio-group>

            <v-divider class="mt-4" />

            <v-card-subtitle class="pb-0 pl-0">Marker Size</v-card-subtitle>
            <v-slider
              v-model="nodeMarkerSize"
              :min="10"
              :max="100"
              :label="String(nodeMarkerSize)"
              inverse-label
              hide-details
            />

            <v-divider class="mt-4" />

            <v-card-subtitle class="pb-0 pl-0">Font Size</v-card-subtitle>
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
              :items="nodeAttrs.concat([null]) "
              :options="nodeAttrs.concat([null]) "
            />

            <v-divider class="mt-4" />

            <v-select 
              v-model="colorVariable"
              label="Color Variable"
              :items="nodeAttrs.concat(['table', null]) "
              :options="nodeAttrs.concat(['table', null]) "
            />

            <v-divider class="mt-4" />

            <v-card-subtitle class="pb-0 px-0" style="display: flex; align-items: center; justify-content: space-between">
              Render Nested Elements
              <v-switch
                class="ma-0"
                v-model="renderNested"
                :disabled="nodeMarkerType === 'Circle'"
                hide-details
              />
            </v-card-subtitle>

            <v-divider class="mt-4" />

            <v-card-subtitle class="pb-0 px-0" style="display: flex; align-items: center; justify-content: space-between">
              Autoselect neighbors
              <v-switch
                class="ma-0"
                v-model="selectNeighbors"
                hide-details
              />
            </v-card-subtitle>
          </v-card-text>

          <v-card-actions>
            <v-btn small @click="startSimulation">Start Simulation</v-btn>
          </v-card-actions>

          <v-card-actions>
            <v-btn small @click="stopSimulation">Stop Simulation</v-btn>
          </v-card-actions>

          <v-card-actions>
            <v-btn small @click="releaseNodes">Release Pinned Nodes</v-btn>
          </v-card-actions>

          <v-card-actions>
            <v-btn small @click="exportGraph">Export Graph</v-btn>
          </v-card-actions>
        </v-card>

        <Legend 
          class="mt-4" 
          cols="3"
          ref="legend"
          v-if="workspace"
          v-bind="{
              graphStructure,
              provenance,
              app,
              nodeAttrs,
              linkAttrs,
              nodeAttrScales,
              linkAttrScales,
              labelVariable,
              colorVariable,
              barVariables,
              glyphVariables,
              widthVariables,
              colorVariables,
            }"
        />

      </v-col>

      <!-- node-link component -->
      <v-col>
        <v-row row wrap class="ma-0 pa-0">
          <node-link
            ref="nodelink"
            v-if="workspace"
            v-bind="{
              graphStructure,
              provenance,
              app,
              nodeMarkerHeight: nodeMarkerSize,
              nodeMarkerLength: nodeMarkerSize,
              nodeMarkerType,
              nodeFontSize,
              selectNeighbors,
              renderNested,
              labelVariable,
              colorVariable,
              barVariables,
              glyphVariables,
              widthVariables,
              colorVariables,
              nodeAttrScales,
              linkAttrScales,
            }"
            />
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
  #control {
    max-height: calc(33vh - 18px);
    overflow-y: scroll
  }
</style>
