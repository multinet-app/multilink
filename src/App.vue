<script lang="ts">
import store from '@/store';
import { getUrlVars } from '@/lib/utils';

import Controls from './components/Controls.vue';

export default {
  name: 'App',

  components: {
    Controls,
  },

  computed: {
    network() {
      return store.getters.network;
    },
    selectedNodes() {
      return store.getters.selectedNodes;
    },
  },

  async mounted() {
    const { workspace, graph, host } = getUrlVars();

    await store.dispatch.initializeState();
    await store.dispatch.fetchNetwork({
      workspaceName: workspace,
      networkName: graph,
    });
  },
};
</script>

<template>
  <v-app>
    <v-content>
      <controls />
    </v-content>
  </v-app>
</template>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: none;
}

.node-link-controls {
  width: 300px;
}
</style>
