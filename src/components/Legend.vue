<script lang="ts">
import store from '@/store';
import { internalFieldNames, Edge, Node } from '@/types';
import DragTarget from '@/components/DragTarget.vue';
import LegendChart from '@/components/LegendChart.vue';
import { computed, defineComponent, ref } from '@vue/composition-api';

export default defineComponent({
  components: {
    DragTarget,
    LegendChart,
  },

  setup() {
    const tab = ref(undefined);

    const network = computed(() => store.state.network);
    const nestedVariables = computed(() => store.state.nestedVariables);
    const edgeVariables = computed(() => store.state.edgeVariables);
    const nodeSizeVariable = computed(() => store.state.nodeSizeVariable);
    const nodeColorVariable = computed(() => store.state.nodeColorVariable);
    const columnTypes = computed(() => store.state.columnTypes);

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
      if (network.value !== null) {
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
      }
      return new Set();
    });

    const cleanedEdgeVariables = computed(() => {
      if (network.value !== null) {
        // Loop through all edges, flatten the 2d array, and turn it into a set
        const allVars: Set<string> = new Set();
        network.value.edges.map((edge: Edge) => Object.keys(edge).forEach((key) => allVars.add(key)));

        internalFieldNames.forEach((field) => allVars.delete(field));
        allVars.delete('source');
        allVars.delete('target');
        allVars.delete('index');

        return cleanVariableList(allVars);
      }
      return new Set();
    });

    const displayCharts = computed(() => store.state.displayCharts);

    return {
      tab,
      nestedVariables,
      edgeVariables,
      nodeSizeVariable,
      nodeColorVariable,
      displayCharts,
      cleanedNodeVariables,
      cleanedEdgeVariables,
    };
  },
});
</script>

<template>
  <div id="legend">
    <v-tabs
      v-model="tab"
      background-color="grey darken-2"
      dark
      grow
      slider-color="blue darken-1"
    >
      <v-tab>
        Node Attrs.
      </v-tab>
      <v-tab>
        Edge Attrs.
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
              :title="'bars'"
              :type="'node'"
            />

            <legend-chart
              v-else
              :var-name="nestedVariables.bar[0]"
              :type="'node'"
              :selected="true"
              :mapped-to="'bars'"
            />

            <drag-target
              v-if="nestedVariables.bar.length < 4 && nestedVariables.bar[0] !== undefined"
              :title="'bars'"
              :type="'node'"
              :show-title="false"
            />
          </div>

          <div v-else>
            <drag-target
              v-if="nodeSizeVariable === ''"
              :title="'size'"
              :type="'node'"
            />

            <legend-chart
              v-else
              :var-name="nodeSizeVariable"
              :type="'node'"
              :selected="true"
              :mapped-to="'size'"
            />
          </div>

          <v-divider />

          <div v-if="displayCharts">
            <drag-target
              v-if="nestedVariables.glyph[0] === undefined"
              :title="'glyphs'"
              :type="'node'"
            />

            <legend-chart
              v-else
              :var-name="nestedVariables.glyph[0]"
              :type="'node'"
              :selected="true"
              :mapped-to="'glyphs'"
            />

            <drag-target
              v-if="nestedVariables.glyph[0] !== undefined && nestedVariables.glyph[1] === undefined"
              :title="'glyphs'"
              :type="'node'"
              :show-title="false"
            />

            <legend-chart
              v-else-if="nestedVariables.glyph[0] !== undefined"
              :var-name="nestedVariables.glyph[1]"
              :type="'node'"
              :selected="true"
              :mapped-to="'glyphs'"
            />
          </div>

          <div v-else>
            <drag-target
              v-if="nodeColorVariable === ''"
              :title="'color'"
              :type="'node'"
            />

            <legend-chart
              v-else
              :var-name="nodeColorVariable"
              :type="'node'"
              :selected="true"
              :mapped-to="'color'"
            />
          </div>

          <v-divider />
        </div>

        <div v-if="cleanedNodeVariables.size === 0">
          No node attributes to visualize
        </div>

        <div
          v-for="nodeAttr of cleanedNodeVariables"
          v-else
          :key="`node${nodeAttr}`"
        >
          <legend-chart
            :var-name="nodeAttr"
            :type="'node'"
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
            :title="'width'"
            :type="'edge'"
          />

          <legend-chart
            v-else
            :var-name="edgeVariables.width"
            :type="'edge'"
            :selected="true"
            :mapped-to="'width'"
          />

          <v-divider />

          <drag-target
            v-if="edgeVariables.color === ''"
            :title="'color'"
            :type="'edge'"
          />

          <legend-chart
            v-else
            :var-name="edgeVariables.color"
            :type="'edge'"
            :selected="true"
            :mapped-to="'color'"
          />

          <v-divider />
        </div>

        <div v-if="cleanedEdgeVariables.size === 0">
          No edge attributes to visualize
        </div>

        <div
          v-for="edgeAttr of cleanedEdgeVariables"
          v-else
          :key="`edge${edgeAttr}`"
        >
          <legend-chart
            :var-name="edgeAttr"
            :type="'edge'"
            :selected="false"
          />
        </div>
      </v-tab-item>
    </v-tabs-items>
  </div>
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
