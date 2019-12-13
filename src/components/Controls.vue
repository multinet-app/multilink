<script>
import NodeLink from '@/components/NodeLink/NodeLink.vue';

import { setUpProvenance } from "@/lib/provenance";
import { getUrlVars } from "@/lib/utils";
import { loadData } from "@/lib/multinet";

/**
 * Demo Controls.  This component is meant to demo
 * the capabilities of the NodeLink vis.
 *
 * You'll probably want the controls to look or
 * work differently in your app, so it's recommended that you
 * implement the controls yourself.
 */
export default {
  components: {
    NodeLink,
  },

  data() {
    /**
     * State shared between the view (NodeLink graph)
     * and the controller (dialog box or other UI).
     */
    return {
      app: null,
      provenance: null,
      graphStructure: {
        nodes: [],
        links: []
      },
      nodeMarkerSize: 50,
      nodeFontSize: 14,
      workspace: null,
      graph: null,
      selectNeighbors: true,
    };
  },

  /**
   * This is the "entrypoint" into this application.
   * Notice the v-if dependency in the template above.
   */
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
      a.href = URL.createObjectURL(new Blob([JSON.stringify(this.graph_structure)], {
        type: `text/json`
      }));
      a.download = "graph.json";
      a.click();
    },
  },
};
</script>

<template>
  <v-container fluid>
    <v-row class="flex-nowrap">
      <!-- control panel content -->
      <v-col class="mt-4" cols="3">
        <v-card>
          <v-card-title class="pb-6">MultiNet Node Link Controls</v-card-title>

          <v-card-text>
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
              nodeFontSize,
              selectNeighbors,
            }"
            @restart-simulation="hello()"
            />
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>
