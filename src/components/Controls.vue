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
    /**
     * State shared between the view (NodeLink graph),
     * the controller (dialog box or other UI),
     * and the legend.
     */
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
      nestedBarVariables: [],
      nestedGlyphVariables: [],
      labelVariable: "_key",
      colorVariable: null,
      linkWidthVariable: null,
      linkColorVariable: null,
      nodeColorScale: d3.scaleOrdinal(d3.schemeCategory10),
      linkColorScale: d3.scaleOrdinal(d3.schemeCategory10),
    };
  },

  computed: {
    variableList() {
      if (typeof this.graphStructure.nodes[0] !== 'undefined') {
        return Object.keys(this.graphStructure.nodes[0]).concat([null]) 
      } else {
        return []
      }
    },
    colorVariableList() {
      if (typeof this.graphStructure.nodes[0] !== 'undefined') {
        return Object.keys(this.graphStructure.nodes[0]).concat(["table", null]) 
      } else {
        return []
      }
    },
    linkVariableList() {
      if (typeof this.graphStructure.links[0] !== 'undefined') {
        return Object.keys(this.graphStructure.links[0]).concat([null]).filter(d => d !== "source" && d !== "target")
      } else {
        return []
      }
    }
  },

  async mounted() {
    const { workspace, graph } = getUrlVars();
    if (!workspace || !graph) {
      throw new Error(
        `Workspace and graph must be set! workspace=${workspace} graph=${graph}`
      );
    }
    this.graphStructure = await loadData(workspace, graph);
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
  },
};
</script>

<template>
  <v-container fluid class="pt-0 pb-0">
    <v-row class="flex-nowrap">
      <!-- control panel content -->
      <v-col cols="3">
        <v-card>
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
              v-model="linkWidthVariable"
              label="Link Width Variable"
              :items="linkVariableList"
              :options="linkVariableList"
            />

            <v-divider class="mt-4" />

            <v-select 
              v-model="linkColorVariable"
              label="Link Color Variable"
              :items="linkVariableList"
              :options="linkVariableList"
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

            <v-card-subtitle class="pb-0 px-0" style="display: flex; align-items: center; justify-content: space-between">
              Render Nested Elements
              <v-switch
                class="ma-0"
                v-model="renderNested"
                :disabled="nodeMarkerType === 'Circle'"
                hide-details
              />
            </v-card-subtitle>

            <v-select
              v-if="renderNested"
              v-model="nestedBarVariables"
              :items="variableList"
              label="Bar Variables"
              multiple
              chips
              deletable-chips
              hint="Choose the variables you'd like to model as bars"
              persistent-hint
            />

            <v-select
              v-if="renderNested"
              v-model="nestedGlyphVariables"
              :items="variableList"
              label="Glyph Variables"
              multiple
              counter=2
              chips
              deletable-chips
              hint="Choose the variables you'd like to model as glyphs"
              persistent-hint
            />

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
              nodeMarkerType,
              selectNeighbors,
              renderNested,
              labelVariable,
              colorVariable,
              nestedBarVariables,
              nestedGlyphVariables,
              linkWidthVariable,
              linkColorVariable,
              nodeColorScale,
              linkColorScale,
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
              nestedBarVariables,
              nestedGlyphVariables,
              linkWidthVariable,
              linkColorVariable,
              nodeColorScale,
              linkColorScale,
            }"
            @restart-simulation="hello()"
            />
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
  .v-card {
    max-height: calc(75vh - 18px);
    overflow-y: scroll
  }
</style>