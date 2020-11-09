<script lang="ts">
import store from '@/store';
import { getUrlVars } from '@/lib/utils';

import Controls from './components/Controls.vue';
import MultiLink from './components/MultiLink/MultiLink.vue';

export default {
  name: 'App',

  components: {
    Controls,
    MultiLink,
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
    <v-main>
      <v-row>
        <v-col cols="3">
          <controls />
        </v-col>

        <v-col
          ref="multilink_container"
          cols="9"
        >
          <v-row>
            <multi-link
              v-if="network && selectedNodes"
              :svg-dimensions="{
                width: this.$refs.multilink_container.clientWidth,
                height: this.$refs.multilink_container.clientHeight,
              }"
            />
          </v-row>
        </v-col>
      </v-row>
    </v-main>
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
