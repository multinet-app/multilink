<script>
/**
 * Demo app for NodeLink component.  To use this library,
 * you'll want to implement this "state container" component
 * yourself and wire it up to your control board on your own.
 */
import NodeLink from "./components/NodeLink/NodeLink.vue";
import Controls from "./components/Controls.vue";
import { setUpProvenance } from "./lib/provenance";
import { getUrlVars } from "./lib/utils";
import { loadData } from "./lib/multinet";

export default {
  name: "app",

  components: { Controls, NodeLink },

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
      workspace: null,
      graph: null,
      simOn: false,
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
  }
};
</script>

<template>
  <v-app>
    <v-content>
      <v-container id="app" fluid class="pa-4 pt-0">
        <v-row class="flex-nowrap">
          <v-col class="shrink mt-4">
            <controls class="node-link-controls"
              :node-marker-size.sync="nodeMarkerSize"
              @restart-simulation="$refs.nodelink.startSimulation()"
            />
          </v-col>
          <v-col>
            <v-row row wrap class="ma-0 pa-0">
              <node-link
                ref="nodelink"
                v-if="workspace"
                :sim-on.sync="simOn"
                v-bind="{ graphStructure, provenance, app, nodeMarkerHeight: nodeMarkerSize, nodeMarkerLength: nodeMarkerSize }"
              />
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </v-content>
  </v-app>
</template>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.node-link-controls {
  width: 300px;
}
</style>
