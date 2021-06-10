<script lang="ts">
import Vue from 'vue';
import store from '@/store';
import { internalFieldNames, Link, Node } from '@/types';
import DragTarget from '@/components/DragTarget.vue';
import LegendChart from '@/components/LegendChart.vue';

export default Vue.extend({
  components: {
    DragTarget,
    LegendChart,
  },

  data() {
    return {
      yAxisPadding: 25, // Gives enough width for hundreds on the y axis
      sticky: {
        barHeight: 100,
        barHorizSpacing: 60,
        barWidth: 30,
        colorMapSquareSize: 15,
        padding: 15,
        plusBackgroundSize: 30,
        rowHeight: 50,
        varNameIndent: 50,
      },
      varPadding: 10,
      tab: undefined,
    };
  },

  computed: {
    network() {
      return store.state.network;
    },

    nestedVariables() {
      return store.state.nestedVariables;
    },

    linkVariables() {
      return store.state.linkVariables;
    },

    nodeSizeVariable() {
      return store.state.nodeSizeVariable;
    },

    nodeColorVariable() {
      return store.state.nodeColorVariable;
    },

    columnTypes() {
      return store.state.columnTypes;
    },

    cleanedNodeVariables(): Set<string> {
      if (this.network !== null) {
        // Loop through all nodes, flatten the 2d array, and turn it into a set
        const allVars: Set<string> = new Set();
        this.network.nodes.forEach((node: Node) => Object.keys(node).forEach((key) => allVars.add(key)));

        internalFieldNames.forEach((field) => allVars.delete(field));
        allVars.delete('vx');
        allVars.delete('vy');
        allVars.delete('x');
        allVars.delete('y');
        allVars.delete('index');
        return this.cleanVariableList(allVars);
      }
      return new Set();
    },

    cleanedLinkVariables(): Set<string> {
      if (this.network !== null) {
        // Loop through all links, flatten the 2d array, and turn it into a set
        const allVars: Set<string> = new Set();
        this.network.edges.map((link: Link) => Object.keys(link).forEach((key) => allVars.add(key)));

        internalFieldNames.forEach((field) => allVars.delete(field));
        allVars.delete('source');
        allVars.delete('target');
        allVars.delete('index');

        return this.cleanVariableList(allVars);
      }
      return new Set();
    },

    displayCharts() {
      return store.state.displayCharts;
    },

    attributeRanges() {
      return store.state.attributeRanges;
    },
  },

  methods: {
    cleanVariableList(list: Set<string>): Set<string> {
      const cleanedVariables = new Set<string>();

      list.forEach((variable) => {
        if (this.columnTypes[variable] !== 'label') {
          cleanedVariables.add(variable);
        }
      });

      return cleanedVariables;
    },
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
        Link Attrs.
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
            v-if="linkVariables.width === ''"
            :title="'width'"
            :type="'link'"
          />

          <legend-chart
            v-else
            :var-name="linkVariables.width"
            :type="'link'"
            :selected="true"
            :mapped-to="'width'"
          />

          <v-divider />

          <drag-target
            v-if="linkVariables.color === ''"
            :title="'color'"
            :type="'link'"
          />

          <legend-chart
            v-else
            :var-name="linkVariables.color"
            :type="'link'"
            :selected="true"
            :mapped-to="'color'"
          />

          <v-divider />
        </div>

        <div v-if="cleanedLinkVariables.size === 0">
          No link attributes to visualize
        </div>

        <div
          v-for="linkAttr of cleanedLinkVariables"
          v-else
          :key="`link${linkAttr}`"
        >
          <legend-chart
            :var-name="linkAttr"
            :type="'link'"
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
