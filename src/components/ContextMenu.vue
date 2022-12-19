<script setup lang="ts">
import { computed } from 'vue';
import { useStore } from '@/store';
import { storeToRefs } from 'pinia';

const store = useStore();
const {
  network,
  selectedNodes,
} = storeToRefs(store);

function pinSelectedNodes() {
  if (network.value !== null) {
    network.value.nodes
      .filter((node) => selectedNodes.value.includes(node._id))
      .forEach((node) => {
        node.fx = node.x;
        node.fy = node.y;
      });
  }
}
function unPinSelectedNodes() {
  if (network.value !== null) {
    network.value.nodes
      .filter((node) => selectedNodes.value.includes(node._id))
      .forEach((node) => {
        delete node.fx;
        delete node.fy;
      });
  }
}

const rightClickMenu = computed(() => store.rightClickMenu);
</script>

<template>
  <div
    id="right-click-menu"
  >
    <v-menu
      v-model="rightClickMenu.show"
      :position-x="rightClickMenu.left"
      :position-y="rightClickMenu.top"
    >
      <v-list>
        <v-list-item
          dense
          @click="store.selectedNodes = []"
        >
          <v-list-item-content>
            <v-list-item-title>Clear Selection</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item
          dense
          @click="pinSelectedNodes()"
        >
          <v-list-item-content>
            <v-list-item-title>Pin Selected Nodes</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item
          dense
          @click="unPinSelectedNodes()"
        >
          <v-list-item-content>
            <v-list-item-title>Un-Pin Selected Nodes</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<style>
#right-click-menu {
  position: absolute;
}
</style>
