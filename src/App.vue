<script lang="ts">
import store from '@/store';
import { getUrlVars } from '@/lib/utils';
import {
  ref, computed, Ref,
} from '@vue/composition-api';

import Alert from '@/components/Alert.vue';
import Controls from '@/components/Controls.vue';
import MultiLink from '@/components/MultiLink.vue';
import ProvVis from '@/components/ProvVis.vue';

export default {
  name: 'App',

  components: {
    Alert,
    Controls,
    MultiLink,
    ProvVis,
  },

  setup() {
    const network = computed(() => store.state.network);
    const selectedNodes = computed(() => store.state.selectedNodes);
    const loadError = computed(() => store.state.loadError);

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

    const urlVars = getUrlVars(); // Takes workspacce and network

    store.dispatch.fetchNetwork({
      workspaceName: urlVars.workspace,
      networkName: urlVars.network,
    }).then(() => {
      store.dispatch.createProvenance();
      store.dispatch.guessLabel();
    });

    // Provenance vis boolean
    const showProvenanceVis = computed(() => store.state.showProvenanceVis);

    return {
      network,
      selectedNodes,
      loadError,
      multilinkContainer,
      multilinkContainerDimensions,
      showProvenanceVis,
    };
  },
};
</script>

<template>
  <v-app>
    <v-main>
      <controls />

      <multi-link
        v-if="network !== null && selectedNodes !== null"
      />

      <alert v-if="loadError.message !== ''" />
    </v-main>

    <prov-vis v-if="showProvenanceVis" />
  </v-app>
</template>

<style>
html {
  scrollbar-width: none;
}

html::-webkit-scrollbar {
  display: none;
}

body {
  overflow: hidden;
}

#app {
  font-family: "Blinker", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: none;
}

.v-btn__content {
  padding-bottom: 2px;
}

.v-input__append-outer {
  margin-left: 0 !important;
}
</style>
