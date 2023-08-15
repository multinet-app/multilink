<script setup lang="ts">
import { computed } from 'vue';
import LegendPanel from '@/components/LegendPanel.vue';

import { useStore } from '@/store';
import { internalFieldNames } from '@/types';
import { storeToRefs } from 'pinia';

const store = useStore();
const {
  displayCharts,
  displayEdges,
  layoutVars,
  fontSize,
  labelVariable,
  selectNeighbors,
  directionalEdges,
  edgeLength,
  simulationRunning,
  columnTypes,
  network,
  markerSize,
} = storeToRefs(store);

const multiVariableList = computed(() => {
  // Loop through all nodes, flatten the 2d array, and turn it into a set
  const allVars: Set<string> = new Set();
  network.value.nodes.forEach((node) => Object.keys(node).forEach((key) => allVars.add(key)));

  internalFieldNames.forEach((field) => allVars.delete(field));
  allVars.delete('vx');
  allVars.delete('vy');
  allVars.delete('x');
  allVars.delete('y');
  allVars.delete('index');
  return allVars;
});
</script>

<template>
  <v-navigation-drawer
    id="app-sidebar"
    permanent
  >
    <!-- control panel content -->
    <v-expansion-panels accordion tile dark multiple>
      <v-expansion-panel>
        <v-expansion-panel-header color="grey darken-3">
          Layout Options
        </v-expansion-panel-header>

        <v-expansion-panel-content color="grey darken-3">
          <v-list>
            <v-list-item>
              <v-autocomplete
                v-model="labelVariable"
                label="Label Variable"
                :items="Array.from(multiVariableList)"
                :hide-details="true"
                clearable
                outlined
                dense
              />
            </v-list-item>
            <v-list-item>
              <v-list-item-content> Display Charts </v-list-item-content>
              <v-list-item-action>
                <v-switch
                  v-model="displayCharts"
                  hide-details
                  color="blue darken-1"
                />
              </v-list-item-action>
            </v-list-item>

            <v-list-item>
              <v-list-item-content> Display All Edges </v-list-item-content>
              <v-list-item-action>
                <v-switch
                  v-model="displayEdges"
                  hide-details
                  color="blue darken-1"
                />
              </v-list-item-action>
            </v-list-item>

            <v-list-item>
              <v-list-item-content> Directional Edges </v-list-item-content>
              <v-list-item-action>
                <v-switch
                  v-model="directionalEdges"
                  hide-details
                  color="blue darken-1"
                />
              </v-list-item-action>
            </v-list-item>

            <v-list-item>
              <v-list-item-content> Autoselect Neighbors </v-list-item-content>
              <v-list-item-action>
                <v-switch
                  v-model="selectNeighbors"
                  hide-details
                  color="blue darken-1"
                />
              </v-list-item-action>
            </v-list-item>

            <v-list-item>
              <v-list-item-content> Marker Size </v-list-item-content>
              <v-slider
                v-model="markerSize"
                :disabled="layoutVars.x !== null || layoutVars.y !== null"
                :min="1"
                :max="50"
                hide-details
                color="blue darken-1"
              />
            </v-list-item>

            <v-list-item>
              <v-list-item-content> Font Size </v-list-item-content>
              <v-slider
                v-model="fontSize"
                :disabled="!labelVariable"
                :min="6"
                :max="12"
                hide-details
                color="blue darken-1"
              />
            </v-list-item>

            <v-list-item>
              <v-list-item-content> Edge Length </v-list-item-content>
              <v-slider
                v-model="edgeLength"
                :disabled="layoutVars.x !== null || layoutVars.y !== null"
                :min="0"
                :max="100"
                hide-details
                color="blue darken-1"
              />
            </v-list-item>

            <v-list-item>
              <v-row>
                <v-col>
                  <v-btn
                    color="grey darken-2"
                    depressed
                    small
                    @click="store.releaseNodes()"
                  >
                    <v-icon
                      left
                      small
                      class="mr-1"
                    >
                      mdi-pin-off
                    </v-icon>
                    Release
                  </v-btn>
                </v-col>
                <v-spacer />
                <v-col>
                  <v-btn
                    color="primary"
                    depressed
                    small
                    width="75"
                    @click="simulationRunning ? store.stopSimulation() : store.startSimulation()"
                  >
                    <v-icon
                      left
                      small
                      class="mr-1"
                    >
                      {{ simulationRunning ? 'mdi-stop' : 'mdi-play' }}
                    </v-icon>
                    {{ simulationRunning ? 'Stop' : 'Start' }}
                  </v-btn>
                </v-col>
              </v-row>
            </v-list-item>
          </v-list>
        </v-expansion-panel-content>
      </v-expansion-panel>

      <legend-panel v-if="columnTypes !== null" />
    </v-expansion-panels>
  </v-navigation-drawer>
</template>

<style scoped>
.v-icon {
  padding-top: 2px;
}

#app-sidebar {
  position: absolute;
  top: 48px !important;
  height: calc(100% - 48px) !important;
}
</style>

<style>
.v-expansion-panel-content__wrap {
  padding: 0 6px 8px 6px;
}
</style>
