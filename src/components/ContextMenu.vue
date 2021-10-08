<script lang="ts">
import store from '@/store';
import {
  computed, defineComponent,
} from '@vue/composition-api';

export default defineComponent({
  setup() {
    const rightClickMenu = computed(() => store.state.rightClickMenu);
    const selectedNodes = computed(() => store.state.selectedNodes);
    const network = computed(() => store.state.network);
    const numericVariables = computed(() => Object.entries(store.state.columnTypes || {})
      .filter(([, value]) => value === 'number')
      .map(([key]) => key)
      .filter((key) => {
        if (network.value !== null) {
          return network.value.nodes[0][key] !== undefined;
        }
        return true;
      })
      .sort());
    const categoricalVariables = computed(() => Object.entries(store.state.columnTypes || {})
      .filter(([, value]) => value !== 'number' && value !== 'label')
      .map(([key]) => key)
      .filter((key) => {
        if (network.value !== null) {
          return network.value.nodes[0][key] !== undefined;
        }
        return true;
      })
      .sort());

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

    function changeLayout(varName: string, axis: 'x' | 'y', type: 'numeric' | 'categorical') {
      // Close the menu
      store.commit.updateRightClickMenu({
        show: false,
        top: rightClickMenu.value.top,
        left: rightClickMenu.value.left,
      });

      store.commit.applyVariableLayout({
        varName, axis, type,
      });
    }

    return {
      rightClickMenu,
      numericVariables,
      categoricalVariables,
      clearSelection,
      pinSelectedNodes,
      unPinSelectedNodes,
      changeLayout,
    };
  },
});
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
                Lay Out By
                <v-icon
                  dense
                  right
                >
                  mdi-chevron-right
                </v-icon>
              </v-list-item-title>
            </template>

            <v-list :width="175">
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
                                @click="changeLayout(numVar, 'x', 'numeric')"
                              >
                                <v-list-item-content>
                                  <v-list-item-title>
                                    X-axis
                                  </v-list-item-title>
                                </v-list-item-content>
                              </v-list-item>

                              <v-list-item
                                dense
                                @click="changeLayout(numVar, 'y', 'numeric')"
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
                    offset-x
                    :disabled="categoricalVariables.length === 0"
                  >
                    <template #activator="{ on, attrs }">
                      <v-list-item-title
                        v-bind="attrs"
                        :class="categoricalVariables.length === 0 ? 'grey--text text--lighten-1' : ''"
                        v-on="on"
                      >
                        Categorical Variable
                        <v-icon
                          dense
                          right
                          :color="categoricalVariables.length === 0 ? 'grey lighten-1' : ''"
                        >
                          mdi-chevron-right
                        </v-icon>
                      </v-list-item-title>
                    </template>

                    <v-list>
                      <v-list-item
                        v-for="catVar in categoricalVariables"
                        :key="catVar"
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
                                {{ catVar }}
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
                                @click="changeLayout(catVar, 'x', 'categorical')"
                              >
                                <v-list-item-content>
                                  <v-list-item-title>
                                    X-axis
                                  </v-list-item-title>
                                </v-list-item-content>
                              </v-list-item>

                              <v-list-item
                                dense
                                @click="changeLayout(catVar, 'y', 'categorical')"
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
