<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useStore } from '@/store';
import api from '@/api';
import { storeToRefs } from 'pinia';

const store = useStore();
const { loadError } = storeToRefs(store);

// Vars to store the selected choices in
const workspace = ref<string | null>(null);
const network = ref<string | null>(null);

// Compute the workspace/network options
const workspaceOptions = ref<string[]>([]);
watchEffect(async () => {
  workspaceOptions.value = (await api.workspaces()).results.map((workspaceObj) => workspaceObj.name);
});

const networkOptions = ref<string[]>([]);
watchEffect(async () => {
  if (workspace.value !== null) {
    networkOptions.value = (await api.networks(workspace.value)).results.map((networkObj) => networkObj.name);
  }
});

const buttonHref = ref(loadError.value.href);
const buttonText = ref('');
watchEffect(async () => {
  if (workspace.value !== null && network.value !== null) {
    buttonHref.value = `./?workspace=${workspace.value}&network=${network.value}`;
    buttonText.value = 'Go To Network';
  } else if (loadError.value.message === 'There was a network issue when getting data') {
    buttonHref.value = loadError.value.href;
    buttonText.value = 'Refresh the page';
  } else {
    buttonHref.value = loadError.value.href;
    buttonText.value = 'Back to MultiNet';
  }
});
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
