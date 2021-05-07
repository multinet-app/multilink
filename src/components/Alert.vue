<script lang="ts">
import store from '@/store';
import {
  computed, Ref, ref, watchEffect,
} from '@vue/composition-api';
import api from '@/api';

export default {
  name: 'Alert',

  setup() {
    const loadError = computed(() => store.state.loadError);

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
    const buttonText: Ref<string> = ref('');
    watchEffect(async () => {
      if (workspace.value !== null && network.value !== null) {
        buttonHref.value = `./?workspace=${workspace.value}&graph=${network.value}`;
        buttonText.value = 'Go To Network';
      } else if (loadError.value.message === 'There was a network issue when getting data') {
        buttonHref.value = loadError.value.href;
        buttonText.value = 'Refresh the page';
      } else {
        buttonHref.value = loadError.value.href;
        buttonText.value = 'Back to MultiNet';
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
      type="warning"
      border="left"
      prominent
      tile
    >
      <v-row align="center">
        <v-col class="grow">
          {{ loadError.message }}

          <br>

          <small v-if="loadError.message === 'You are not authorized to view this workspace'">
            If you are already logged in, please check with the workspace owner to verify your permissions.
          </small>

          <small v-else>
            Select a workspace and network you'd like to view.
          </small>
        </v-col>

        <v-col
          v-if="buttonText !== 'Refresh the page'"
          class="grow, py-0"
        >
          <v-row>
            <v-col class="py-0">
              <v-select
                v-model="workspace"
                label="Workspace"
                :items="workspaceOptions"
              />
            </v-col>

            <v-col class="py-0">
              <v-select
                v-model="network"
                label="Network"
                :items="networkOptions"
              />
            </v-col>
          </v-row>
        </v-col>

        <v-col class="shrink">
          <v-btn
            :href="buttonHref"
            depressed
            dark
            color="grey darken-3"
          >
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
