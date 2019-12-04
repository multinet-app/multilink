<template>
  <div id="app">
    <node-link
      v-if="workspace"
      v-bind="{ graphStructure, provenance, app }"
    />
  </div>
</template>

<script>
import NodeLink from './components/NodeLink/NodeLink.vue'
import { setUpProvenance } from './lib/provenance';
import { getUrlVars } from './lib/utils';
import { loadData } from './lib/multinet';

export default {
  name: 'app',
  
  components: { NodeLink },

  data() {
    /**
     * State shared between the view (NodeLink graph)
     * and the controller (dialog box or other UI).
     */
    return {
      app: null,
      provenance: null,
      graphStructure: {
        "nodes": [],
        "links": [],
      },
      workspace: null,
      graph: null,
    };
  },

  /**
   * This is the "entrypoint" into this application.
   * Notice the v-if dependency in the template above.
   */
  async mounted() {
    const { workspace, graph } = getUrlVars();
    if (!workspace || !graph) {
      throw new Error(`Workspace and graph must be set! workspace=${workspace} graph=${graph}`);
    }
    this.graphStructure = await loadData(workspace, graph);
    const { provenance, app } = setUpProvenance(this.graphStructure.nodes);
    this.app = app;
    this.provenance = provenance;
    this.workspace = workspace;
    this.graph = graph;
  },
}
</script>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
