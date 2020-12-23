<script lang="ts">
import store from '@/store';
import { getUrlVars } from '@/lib/utils';
import {
  ref, computed, Ref,
} from '@vue/composition-api';

import Controls from './components/Controls.vue';
import MultiLink from './components/MultiLink/MultiLink.vue';

export default {
  name: 'App',

  components: {
    Controls,
    MultiLink,
  },

  setup() {
    const network = computed(() => store.getters.network);
    const selectedNodes = computed(() => store.getters.selectedNodes);
    const loadError = computed(() => store.getters.loadError);

    const multilinkContainer: Ref<Element | null> = ref(null);
    const multilinkContainerDimensions = computed(() => {
      if (multilinkContainer.value !== null) {
        return {
          width: multilinkContainer.value.clientWidth - 24,
          height: multilinkContainer.value.clientHeight - 24,
        };
      }
      return null;
    });

    const { workspace, graph } = getUrlVars();

    store.dispatch.fetchNetwork({
      workspaceName: workspace,
      networkName: graph,
    });

    store.commit.createProvenance();

    return {
      network,
      selectedNodes,
      loadError,
      multilinkContainer,
      multilinkContainerDimensions,
    };
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
          ref="multilinkContainer"
          cols="9"
        >
          <v-row>
            <multi-link
              v-if="network !== null && selectedNodes !== null"
              :svg-dimensions="multilinkContainerDimensions"
            />

            <v-alert
              type="error"
              :value="loadError.message !== ''"
              prominent
            >
              <v-row align="center">
                <v-col class="grow">
                  {{ loadError.message }}
                </v-col>
                <v-col class="shrink">
                  <v-btn :href="loadError.href">
                    {{ loadError.buttonText }}
                  </v-btn>
                </v-col>
              </v-row>
            </v-alert>
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
