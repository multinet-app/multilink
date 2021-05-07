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

    removeMapping(
      type: 'nodeBar' | 'nodeGlyph' | 'nodeSize' | 'nodeColor' | 'linkWidth' | 'linkColor',
      varName?: string,
    ) {
      if (type === 'nodeBar' && varName !== undefined) {
        const newBarVars = this.nestedVariables.bar.filter(
          (barVar) => barVar !== varName,
        );

        store.commit.setNestedVariables({
          bar: newBarVars,
          glyph: this.nestedVariables.glyph,
        });
      } else if (type === 'nodeGlyph' && varName !== undefined) {
        const newGlyphVars = this.nestedVariables.glyph.filter(
          (glyphVar) => glyphVar !== varName,
        );

        store.commit.setNestedVariables({
          bar: this.nestedVariables.bar,
          glyph: newGlyphVars,
        });
      }
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
      <v-tab class="text-subtitle-2">
        Node Attrs.
      </v-tab>
      <v-tab class="text-subtitle-2">
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

          <v-divider />

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
}

.draggable {
  cursor: pointer;
}
</style>
