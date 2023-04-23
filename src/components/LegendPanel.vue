<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStore } from '@/store';
import { internalFieldNames, Edge, Node } from '@/types';
import DragTarget from '@/components/DragTarget.vue';
import LegendChart from '@/components/LegendChart.vue';
import { storeToRefs } from 'pinia';

const store = useStore();
const {
  network,
  nestedVariables,
  edgeVariables,
  nodeSizeVariable,
  nodeColorVariable,
  columnTypes,
  displayCharts,
  layoutVars,
} = storeToRefs(store);

const tab = ref(0);

function cleanVariableList(list: Set<string>): Set<string> {
  const cleanedVariables = new Set<string>();

  list.forEach((variable) => {
    if (columnTypes.value !== null && columnTypes.value[variable] !== 'label') {
      cleanedVariables.add(variable);
    }
  });

  return cleanedVariables;
}

const cleanedNodeVariables = computed(() => {
  // Loop through all nodes, flatten the 2d array, and turn it into a set
  const allVars: Set<string> = new Set();
  network.value.nodes.forEach((node: Node) => Object.keys(node).forEach((key) => allVars.add(key)));

  internalFieldNames.forEach((field) => allVars.delete(field));
  allVars.delete('vx');
  allVars.delete('vy');
  allVars.delete('x');
  allVars.delete('y');
  allVars.delete('index');
  return cleanVariableList(allVars);
});

const cleanedEdgeVariables = computed(() => {
  // Loop through all edges, flatten the 2d array, and turn it into a set
  const allVars: Set<string> = new Set();
  network.value.edges.map((edge: Edge) => Object.keys(edge).forEach((key) => allVars.add(key)));

  internalFieldNames.forEach((field) => allVars.delete(field));
  allVars.delete('source');
  allVars.delete('target');
  allVars.delete('index');

  return cleanVariableList(allVars);
});

const attributeLayout = ref(false);
</script>

<template>
  <v-expansion-panel>
    <v-expansion-panel-header color="grey darken-3">
      Attribute Options
    </v-expansion-panel-header>

    <v-expansion-panel-content color="grey darken-3">
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
        <v-list-item-content> Attribute Layout </v-list-item-content>
        <v-list-item-action>
          <v-switch
            v-model="attributeLayout"
            hide-details
            color="blue darken-1"
          />
        </v-list-item-action>
      </v-list-item>

      <v-tabs
        v-model="tab"
        grow
        background-color="grey darken-3"
      >
        <v-tab>
          Node
        </v-tab>
        <v-tab>
          Edge
        </v-tab>
      </v-tabs>

      <v-tabs-items
        v-model="tab"
      >
        <v-tab-item
          class="pb-4"
        >
          <div class="sticky">
            <div v-if="displayCharts">
              <drag-target
                v-if="nestedVariables.bar[0] === undefined"
                title="bars"
                type="node"
              />

              <legend-chart
                v-else
                :var-name="nestedVariables.bar[0]"
                type="node"
                :selected="true"
                mapped-to="bars"
              />

              <drag-target
                v-if="nestedVariables.bar.length < 4 && nestedVariables.bar[0] !== undefined"
                title="bars"
                type="node"
                :show-title="false"
              />
            </div>

            <div v-else>
              <drag-target
                v-if="nodeSizeVariable === ''"
                title="size"
                type="node"
              />

              <legend-chart
                v-else
                :var-name="nodeSizeVariable"
                type="node"
                :selected="true"
                mapped-to="size"
              />
            </div>

            <v-divider />

            <div v-if="displayCharts">
              <drag-target
                v-if="nestedVariables.glyph[0] === undefined"
                title="glyphs"
                type="node"
              />

              <legend-chart
                v-else
                :var-name="nestedVariables.glyph[0]"
                type="node"
                :selected="true"
                mapped-to="glyphs"
              />

              <drag-target
                v-if="nestedVariables.glyph[0] !== undefined && nestedVariables.glyph[1] === undefined"
                title="glyphs"
                type="node"
                :show-title="false"
              />

              <legend-chart
                v-else-if="nestedVariables.glyph[0] !== undefined"
                :var-name="nestedVariables.glyph[1]"
                type="node"
                :selected="true"
                mapped-to="glyphs"
              />
            </div>

            <div v-else>
              <drag-target
                v-if="nodeColorVariable === ''"
                title="color"
                type="node"
              />

              <legend-chart
                v-else
                :var-name="nodeColorVariable"
                type="node"
                :selected="true"
                mapped-to="color"
              />
            </div>

            <v-divider />

            <div v-if="attributeLayout">
              <drag-target
                v-if="layoutVars.x === null"
                title="x variable"
                type="node"
              />

              <legend-chart
                v-else
                :var-name="layoutVars.x"
                type="node"
                :selected="true"
                mapped-to="x"
              />
              <v-divider />

              <drag-target
                v-if="layoutVars.y === null"
                title="y variable"
                type="node"
              />

              <legend-chart
                v-else
                :var-name="layoutVars.y"
                type="node"
                :selected="true"
                mapped-to="y"
              />
              <v-divider />
            </div>
          </div>

          <v-subheader class="white--text" style="background-color: #424242">
            Attributes
          </v-subheader>

          <div v-if="cleanedNodeVariables.size === 0">
            No node attributes to visualize
          </div>

          <div
            v-else
          >
            <legend-chart
              v-for="nodeAttr of cleanedNodeVariables"
              :key="`node${nodeAttr}`"
              :var-name="nodeAttr"
              type="node"
              :selected="false"
            />
          </div>
        </v-tab-item>

        <v-tab-item
          class="pb-4"
        >
          <div class="sticky">
            <drag-target
              v-if="edgeVariables.width === ''"
              title="width"
              type="edge"
            />

            <legend-chart
              v-else
              :var-name="edgeVariables.width"
              type="edge"
              :selected="true"
              mapped-to="width"
            />

            <v-divider />

            <drag-target
              v-if="edgeVariables.color === ''"
              title="color"
              :type="'edge'"
            />

            <legend-chart
              v-else
              :var-name="edgeVariables.color"
              type="edge"
              :selected="true"
              mapped-to="color"
            />

            <v-divider />
          </div>

          <v-subheader class="white--text" style="background-color: #1E1E1E">
            Attributes
          </v-subheader>

          <div v-if="cleanedEdgeVariables.size === 0">
            No edge attributes to visualize
          </div>

          <div
            v-else
          >
            <legend-chart
              v-for="edgeAttr of cleanedEdgeVariables"
              :key="`edge${edgeAttr}`"
              :var-name="edgeAttr"
              type="edge"
              :selected="false"
            />
          </div>
        </v-tab-item>
      </v-tabs-items>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<style scoped>
.sticky {
  position: sticky;
  top: 0;
  z-index: 2;
  background-color: white;
}

.draggable {
  cursor: pointer;
}
</style>
