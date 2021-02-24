<script lang="ts">
import store from '@/store';
import { computed } from '@vue/composition-api';

export default {
  setup() {
    const rightClickMenu = computed(() => store.getters.rightClickMenu);
    const selectedNodes = computed(() => store.getters.selectedNodes);
    const network = computed(() => store.getters.network);

    function clearSelection() {
      store.commit.setSelected(new Set());
    }

    function pinSelectedNodes() {
      if (network.value !== null) {
        network.value.nodes
          .filter((node) => selectedNodes.value.has(node._id))
          .forEach((node) => {
            // eslint-disable-next-line no-param-reassign
            node.fx = node.x;
            // eslint-disable-next-line no-param-reassign
            node.fy = node.y;
          });
      }
    }

    return {
      rightClickMenu,
      clearSelection,
      pinSelectedNodes,
    };
  },
};
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
          @click="clearSelection"
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
      </v-list>
    </v-menu>
  </div>
</template>

<style>
#right-click-menu {
  position: absolute;
}
</style>
