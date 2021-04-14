<script lang="ts">
import store from '@/store';
import { computed, ref, watchEffect } from '@vue/composition-api';

export default {
  setup() {
    const rightClickMenu = computed(() => store.getters.rightClickMenu);
    const selectedNodes = computed(() => store.getters.selectedNodes);
    const network = computed(() => store.getters.network);
    const numericVariables = computed(() => {
      const numericColumns = Object.entries(store.getters.columnTypes)
        .map(([key, value]) => (value === 'number' ? key : ''));

      const numericColumnsSet = new Set(numericColumns);
      numericColumnsSet.delete('');

      numericColumnsSet.forEach((column) => {
        if (
          store.getters.network !== null
          && store.getters.network.nodes[0] !== null
          && store.getters.network.nodes[0][column] === undefined
        ) {
          numericColumnsSet.delete(column);
        }
      });

      return [...numericColumnsSet].sort();
    });

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

    function unPinSelectedNodes() {
      if (network.value !== null) {
        network.value.nodes
          .filter((node) => selectedNodes.value.has(node._id))
          .forEach((node) => {
            // eslint-disable-next-line no-param-reassign
            delete node.fx;
            // eslint-disable-next-line no-param-reassign
            delete node.fy;
          });
      }
    }

    // Track whether the layout has been applied before, reset when simulation starts again
    // If so, we won't want to reset the "other axis" to a constant value
    const firstLayout = ref(true);
    watchEffect(() => {
      if (store.getters.simulationRunning && !firstLayout.value) {
        firstLayout.value = true;
      }
    });

    function changeLayout(numVar: string, axis: 'x' | 'y') {
      // Close the menu
      store.commit.updateRightClickMenu({
        show: false,
        top: rightClickMenu.value.top,
        left: rightClickMenu.value.left,
      });

      store.commit.applyNumericLayout({ varName: numVar, axis, firstLayout: firstLayout.value });

      firstLayout.value = false;
    }

    return {
      rightClickMenu,
      numericVariables,
      clearSelection,
      pinSelectedNodes,
      unPinSelectedNodes,
      changeLayout,
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

        <v-list-item
          dense
          @click="unPinSelectedNodes()"
        >
          <v-list-item-content>
            <v-list-item-title>Un-Pin Selected Nodes</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item
          dense
        >
          <v-menu
            allow-overflow
            offset-x
          >
            <template #activator="{ on, attrs }">
              <v-list-item-title
                v-bind="attrs"
                v-on="on"
              >
                Layout By
                <v-icon
                  dense
                  right
                >
                  mdi-chevron-right
                </v-icon>
              </v-list-item-title>
            </template>

            <v-list>
              <v-list-item
                dense
              >
                <v-list-item-content>
                  <v-menu
                    offset-x
                    :disabled="numericVariables.length === 0"
                  >
                    <template #activator="{ on, attrs }">
                      <v-list-item-title
                        v-bind="attrs"
                        :class="numericVariables.length === 0 ? 'grey--text text--lighten-1' : ''"
                        v-on="on"
                      >
                        Numerical Variable
                        <v-icon
                          dense
                          right
                          :color="numericVariables.length === 0 ? 'grey lighten-1' : ''"
                        >
                          mdi-chevron-right
                        </v-icon>
                      </v-list-item-title>
                    </template>

                    <v-list>
                      <v-list-item
                        v-for="numVar in numericVariables"
                        :key="numVar"
                        dense
                      >
                        <v-list-item-content>
                          <v-menu
                            offset-x
                          >
                            <template #activator="{ on, attrs }">
                              <v-list-item-title
                                v-bind="attrs"
                                v-on="on"
                              >
                                {{ numVar }}
                                <v-icon
                                  dense
                                  right
                                >
                                  mdi-chevron-right
                                </v-icon>
                              </v-list-item-title>
                            </template>

                            <v-list>
                              <v-list-item
                                dense
                                @click="changeLayout(numVar, 'x')"
                              >
                                <v-list-item-content>
                                  <v-list-item-title>
                                    X-axis
                                  </v-list-item-title>
                                </v-list-item-content>
                              </v-list-item>

                              <v-list-item
                                dense
                                @click="changeLayout(numVar, 'y')"
                              >
                                <v-list-item-content>
                                  <v-list-item-title>
                                    Y-axis
                                  </v-list-item-title>
                                </v-list-item-content>
                              </v-list-item>
                            </v-list>
                          </v-menu>
                        </v-list-item-content>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </v-list-item-content>
              </v-list-item>

              <v-list-item
                dense
              >
                <v-list-item-content>
                  <v-menu
                    disabled
                    offset-x
                  >
                    <template #activator="{ on, attrs }">
                      <v-list-item-title
                        v-bind="attrs"
                        v-on="on"
                      >
                        Categorical Variable
                        <v-icon
                          dense
                          right
                        >
                          mdi-chevron-right
                        </v-icon>
                      </v-list-item-title>
                    </template>

                    <v-list>
                      This is where the categorical vars go
                    </v-list>
                  </v-menu>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-menu>
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
