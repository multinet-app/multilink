<script lang="ts">
import store from '@/store';
import {
  computed, Ref, ref, watchEffect,
} from '@vue/composition-api';
import api from '@/api';

export default {
  name: 'Alert',

  setup() {
    const loadError = computed(() => store.getters.loadError);

    // Vars to store the selected choices in
    const workspace: Ref<string | null> = ref(null);
    const network: Ref<string | null> = ref(null);

    // Compute the workspace/network options
    const workspaceOptions: Ref<string[]> = ref([]);
    watchEffect(async () => {
      workspaceOptions.value = await api.workspaces();
    });

    const networkOptions: Ref<string[]> = ref([]);
    watchEffect(async () => {
      if (workspace.value !== null) {
        networkOptions.value = await api.graphs(workspace.value);
      }
    });

    const buttonHref: Ref<string> = ref(loadError.value.href);
    const buttonText: Ref<string> = ref(loadError.value.href);
    watchEffect(async () => {
      if (workspace.value !== null && network.value !== null) {
        buttonHref.value = `./?workspace=${workspace.value}&graph=${network.value}`;
        buttonText.value = 'Go To Graph';
      } else {
        buttonHref.value = loadError.value.href;
        buttonText.value = loadError.value.buttonText;
      }
    });

    return {
      buttonHref,
      buttonText,
      loadError,
      network,
      networkOptions,
      workspace,
      workspaceOptions,
    };
  },
};
</script>

<template>
  <div>
    <v-alert
      type="error"
      prominent
    >
      <v-row align="center">
        <v-col class="grow">
          {{ loadError.message }}
        </v-col>

        <v-col
          v-if="loadError.buttonText === 'Back to MultiNet'"
          class="grow"
        >
          <v-row>
            <v-col>
              <v-select
                v-model="workspace"
                label="Workspace"
                :items="workspaceOptions"
              />
            </v-col>

            <v-col>
              <v-select
                v-model="network"
                label="Graph"
                :items="networkOptions"
              />
            </v-col>
          </v-row>
        </v-col>

        <v-col class="shrink">
          <v-btn :href="buttonHref">
            {{ buttonText }}
          </v-btn>
        </v-col>
      </v-row>
    </v-alert>
  </div>
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
</style>
