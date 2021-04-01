<script lang="ts">
import store from '@/store';
import { computed } from '@vue/composition-api';

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

    return {
      rightClickMenu,
      numericVariables,
      clearSelection,
      pinSelectedNodes,
      unPinSelectedNodes,
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
                  >
                    <template #activator="{ on, attrs }">
                      <v-list-item-title
                        v-bind="attrs"
                        v-on="on"
                      >
                        Numerical Variable
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
