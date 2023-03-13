<script setup lang="ts">
import { ProvVisCreator } from '@trrack/vis-react';
import { onMounted, ref } from 'vue';
import { useStore } from '@/store';
import { storeToRefs } from 'pinia';

const store = useStore();
const { provenance } = storeToRefs(store);

const provDiv = ref();
const provVisHeight = ref(document.body.clientHeight - 48 - 48);
const resizeObserver = new ResizeObserver((entries) => { provVisHeight.value = entries[0].target.clientHeight - 48 - 48; });
resizeObserver.observe(document.body);

onMounted(() => {
  if (provenance.value !== null && provDiv.value != null) {
    ProvVisCreator(provDiv.value, provenance.value);
  }
});
</script>

<template>
  <v-navigation-drawer
    id="prov-vis"
    permanent
    right
    :width="145 + 190"
  >
    <v-subheader id="header" class="grey darken-3 py-0 pr-0 white--text">
      History

      <v-spacer />

      <v-btn
        :min-width="40"
        :height="48"
        depressed
        tile
        class="grey darken-3 pa-0"
        dark
        @click="store.showProvenanceVis = false"
      >
        <v-icon>
          mdi-close
        </v-icon>
      </v-btn>
    </v-subheader>

    <div
      id="provDiv"
      ref="provDiv"
      :style="`height: ${provVisHeight}px`"
    />
  </v-navigation-drawer>
</template>

<style scoped>
#prov-vis {
  position: absolute;
  top: 48px !important;
  height: calc(100% - 48px) !important;
}

#header {
  position: -webkit-sticky; /* Safari */
  position: sticky;
  top: 0;
  z-index: 2;
}
</style>
