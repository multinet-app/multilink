<script lang="ts">
import Vue, { PropType } from 'vue';
import { min, max } from 'd3-array';
import { select } from 'd3-selection';
import { scaleLinear, scaleBand, ScaleBand } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { brushX } from 'd3-brush';
import { TableMetadata } from 'multinet';

import { Node, Link, Network } from '@/types';
import store from '@/store';

export default Vue.extend({
  props: {
    graphStructure: {
      type: Object as PropType<Network | null>,
      default: null,
    },
    multiVariableList: {
      type: Set,
      default: () => new Set(),
    },
    linkVariableList: {
      type: Set,
      default: () => new Set(),
    },
  },

  data() {
    return {
      svgHeight: 150,
      yAxisPadding: 10,
      varPadding: 10,
    };
  },

  computed: {
    properties() {
      const {
        graphStructure,
        multiVariableList,
        linkVariableList,
      } = this;
      return {
        graphStructure,
        multiVariableList,
        linkVariableList,
      };
    },

    nestedVariables() {
      return store.getters.nestedVariables;
    },

    linkVariables() {
      return store.getters.linkVariables;
    },

    nodeColorScale() {
      return store.getters.nodeColorScale;
    },

    columnTypes() {
      const typeMapping: { [key: string]: string } = {};

      if (store.getters.networkMetadata !== null) {
        Object.values(store.getters.networkMetadata).forEach((metadata) => {
          (metadata as TableMetadata).table.columns.forEach((columnType) => {
            typeMapping[columnType.key] = columnType.type;
          });
        });
      }

      return typeMapping;
    },

    cleanedNodeVariables(): Set<string> {
      return this.cleanVariableList(this.multiVariableList as Set<string>);
    },

    cleanedLinkVariables(): Set<string> {
      return this.cleanVariableList(this.linkVariableList as Set<string>);
    },
  },

  mounted() {
    this.setUpPanel();
  },

  methods: {
    setUpPanel() {
      // For node and link variables
      [this.multiVariableList as Set<string>, this.linkVariableList as Set<string>].forEach((list) => {
        // For each attribute
        list.forEach((attr) => {
          // Get the SVG element and its width
          const type = list === this.multiVariableList ? 'node' : 'link';
          const variableSvg = select(`#${type}${attr}`);

          const variableSvgWidth = (variableSvg
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .node() as any)
            .getBoundingClientRect()
            .width - this.yAxisPadding - this.varPadding;

          // Get the data and generate the bins
          if (this.graphStructure === null) {
            return;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let currentData: any[];

          if (type === 'node') {
            currentData = this.graphStructure.nodes.map((d: Node | Link) => d[attr]);
          } else {
            currentData = this.graphStructure.edges.map((d: Node | Link) => d[attr]);
          }
          const bins = new Map([...new Set(currentData)].map(
            (x) => [x, currentData.filter((y) => y === x).length],
          ));

          const binLabels: string[] = [];
          const binValues: number[] = [];
          bins.forEach((value, label) => {
            binLabels.push(label);
            binValues.push(value);
          });

          // Add the domain of values to attributeScales
          if (type === 'node' && this.isQuantitative(attr, type)) {
            store.commit.addAttributeRange({ attr, min: parseFloat(min(binLabels) || '0'), max: parseFloat(max(binLabels) || '0') });
          }

          // Generate axis scales
          const yScale = scaleLinear()
            .domain([min(binValues) || 0, max(binValues) || 0])
            .range([this.svgHeight, 0]);

          const xScale = scaleBand()
            .domain(binLabels)
            .range([this.yAxisPadding, variableSvgWidth]);

          // Add the axis scales onto the chart
          variableSvg
            .append('g')
            .attr('transform', `translate(${this.yAxisPadding},0)`)
            .call(axisLeft(yScale));

          variableSvg
            .append('g')
            .attr('transform', `translate(0, ${this.svgHeight})`)
            .call(axisBottom(xScale));

          // Add the bars
          const variableSvgEnter = (variableSvg
            .selectAll()
            .data(currentData)
            .enter()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .append('rect') as any)
            .attr('x', (d: string) => xScale(d))
            .attr('y', (d: string) => yScale(bins.get(d) || 0))
            .attr('height', (d: string) => this.svgHeight - yScale(bins.get(d) || 0))
            .attr('width', xScale.bandwidth())
            .attr('fill', (d: string) => (this.isQuantitative(attr, type) ? '#82B1FF' : this.nodeColorScale(d)));

          // Add the brush
          const brush = brushX()
            .extent([[this.yAxisPadding, 0], [variableSvgWidth, this.svgHeight]])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .on('start brush', (event: any) => {
              const extent = event.selection;

              // Set the brush highlighting on the legend svg
              variableSvgEnter
                .attr('stroke', (d: string) => ((xScale(d) || 0) >= extent[0] - xScale.bandwidth() && (xScale(d) || 0) <= extent[1] ? '#000000' : ''));

              // TODO: Update the nested bars domain
              // if (attr === this.barVariables[0]) {
              //   const new_domain = [
              //     this.ordinalInvert(extent[0], xScale, binLabels)[0],
              //     this.ordinalInvert(extent[1], xScale, binLabels)[0]
              //   ]
              //   this.linkWidthScale.domain(new_domain).range([2,20])
              // }

              // TODO: Update the nested glyph domain
              // if (attr === this.barVariables[0]) {
              //   const new_domain = [
              //     this.ordinalInvert(extent[0], xScale, binLabels)[0],
              //     this.ordinalInvert(extent[1], xScale, binLabels)[0]
              //   ]
              //   this.linkWidthScale.domain(new_domain).range([2,20])
              // }

              // Update the link width domain
              if (attr === this.linkVariables.width) {
                const newDomain = [
                  this.ordinalInvert(extent[0], xScale, binLabels),
                  this.ordinalInvert(extent[1], xScale, binLabels),
                ];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                store.commit.updateLinkWidthDomain(newDomain as number[]);
              }
            });

          variableSvg
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .call((brush as any))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .call((brush.move as any), xScale.range());
        });
      });
    },

    isQuantitative(varName: string, type: 'node' | 'link') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let nodesOrLinks: any[];

      if (this.graphStructure !== null) {
        nodesOrLinks = type === 'node' ? this.graphStructure.nodes : this.graphStructure.edges;
        const uniqueValues = [...new Set(nodesOrLinks.map((element) => parseFloat(element[varName])))];
        return uniqueValues.length > 5;
      }
      return false;
    },

    ordinalInvert(pos: number, scale: ScaleBand<string>, binLabels: string[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let previous: any = null;
      const domain = scale.domain();

      domain.forEach((value, idx: number) => {
        if (idx !== null) {
          if ((scale(binLabels[idx]) || 0) > pos) {
            return previous;
          }
          previous = binLabels[idx];
        }

        return null;
      });
      return previous;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rectDrop(newEvent: any) {
      const droppedEl = newEvent.dataTransfer.getData('attr_id');
      const type = droppedEl.substring(0, 4) === 'node' ? 'node' : 'link';
      const targetEl = newEvent.target.parentNode.id;
      const droppedElText: string = droppedEl.replace(type, '').replace('div', '');

      if (type === 'node' && targetEl === 'barElements') {
        const updatedNestedVars = {
          bar: [...this.nestedVariables.bar, droppedElText],
          glyph: this.nestedVariables.glyph,
        };
        store.commit.setNestedVariables(updatedNestedVars);
      } else if (type === 'node' && targetEl === 'glyphElements') {
        const updatedNestedVars = {
          bar: this.nestedVariables.bar,
          glyph: [...this.nestedVariables.glyph, droppedElText],
        };
        store.commit.setNestedVariables(updatedNestedVars);
      } else if (type === 'link' && targetEl === 'widthElements') {
        const updatedLinkVars = {
          width: droppedElText,
          color: this.linkVariables.color,
        };
        store.commit.setLinkVariables(updatedLinkVars);
      } else if (type === 'link' && targetEl === 'colorElements') {
        const updatedLinkVars = {
          width: this.linkVariables.width,
          color: droppedElText,
        };
        store.commit.setLinkVariables(updatedLinkVars);
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dragStart(newEvent: any) {
      newEvent.dataTransfer.setData('attr_id', newEvent.target.id);
    },

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
    <!-- Sticky SVG to drag variables onto -->
    <svg
      class="sticky"
      height="33%"
      width="100%"
    >
      <rect
        width="100%"
        height="100%"
        fill="#DDDDDD"
        opacity="1"
      />

      <!-- Node elements -->
      <g id="nodeMapping">
        <text
          font-size="16pt"
          y="-102"
          dominant-baseline="hanging"
        >Node Mapping</text>
        <circle
          r="70"
          fill="#82B1FF"
        />

        <!-- Bar adding elements -->
        <g
          id="barElements"
          @dragenter="(e) => e.preventDefault()"
          @dragover="(e) => e.preventDefault()"
          @drop="rectDrop"
        >
          <rect
            width="10%"
            height="40%"
            fill="#EEEEEE"
          />
          <text
            class="barLabel"
            font-size="10pt"
            dominant-baseline="hanging"
          >Bars</text>
          <path
            v-if="nestedVariables.bar.length === 0"
            class="plus"
            d="M0,-10 V10 M-10,0 H10"
            stroke="black"
            stroke-width="3px"
          />
          <text
            v-for="(barVar, i) of nestedVariables.bar"
            :key="barVar"
            :transform="`translate(0,${i * 15 + 15})`"
            dominant-baseline="hanging"
            style="text-anchor: start;"
            font-size="9pt"
          >{{ barVar }}</text>
        </g>

        <!-- Glyph adding elements -->
        <g
          id="glyphElements"
          @dragenter="(e) => e.preventDefault()"
          @dragover="(e) => e.preventDefault()"
          @drop="rectDrop"
        >
          <rect
            width="10%"
            height="40%"
            fill="#EEEEEE"
          />
          <text
            class="barLabel"
            font-size="10pt"
            dominant-baseline="hanging"
          >Glyphs</text>
          <path
            v-if="nestedVariables.glyph.length === 0"
            class="plus"
            d="M0,-10 V10 M-10,0 H10"
            stroke="black"
            stroke-width="3px"
          />
          <text
            v-for="(glyphVar, i) of nestedVariables.glyph"
            :key="glyphVar"
            :transform="`translate(0,${i * 15 + 15})`"
            dominant-baseline="hanging"
            style="text-anchor: start;"
            font-size="9pt"
          >{{ glyphVar }}</text>
        </g>
      </g>

      <!-- Link elements -->
      <g id="linkMapping">
        <text
          font-size="16pt"
          y="-102"
          dominant-baseline="hanging"
        >Link Mapping</text>
        <rect
          x="-70"
          y="-70"
          width="140"
          height="140"
          fill="#82B1FF"
        />

        <!-- Width adding elements -->
        <g
          id="widthElements"
          @dragenter="(e) => e.preventDefault()"
          @dragover="(e) => e.preventDefault()"
          @drop="rectDrop"
        >
          <rect
            width="10%"
            height="40%"
            fill="#EEEEEE"
          />
          <text
            class="barLabel"
            font-size="10pt"
            dominant-baseline="hanging"
          >Width</text>
          <path
            v-if="!linkVariables.width"
            class="plus"
            d="M0,-10 V10 M-10,0 H10"
            stroke="black"
            stroke-width="3px"
          />
          <text
            transform="translate(0,15)"
            dominant-baseline="hanging"
            style="text-anchor: start;"
            font-size="9pt"
          >{{ linkVariables.width }}</text>
        </g>

        <!-- Color adding elements -->
        <g
          id="colorElements"
          @dragenter="(e) => e.preventDefault()"
          @dragover="(e) => e.preventDefault()"
          @drop="rectDrop"
        >
          <rect
            width="10%"
            height="40%"
            fill="#EEEEEE"
          />
          <text
            class="barLabel"
            font-size="10pt"
            dominant-baseline="hanging"
          >Color</text>
          <path
            v-if="!linkVariables.color"
            class="plus"
            d="M0,-10 V10 M-10,0 H10"
            stroke="black"
            stroke-width="3px"
          />
          <text
            transform="translate(0,15)"
            dominant-baseline="hanging"
            style="text-anchor: start;"
            font-size="9pt"
          >{{ linkVariables.color }}</text>
        </g>
      </g>
    </svg>

    <!-- Variables to brush and to drag onto the sticky SVG -->
    <div :style="{'padding': `${varPadding}px`}">
      <h2>Node Attributes</h2>
      <br>

      <div v-if="cleanedNodeVariables.size === 0">
        No node attributes to visualize
      </div>

      <div
        v-for="nodeAttr of cleanedNodeVariables"
        v-else
        :id="`node${nodeAttr}div`"
        :key="`node${nodeAttr}`"
        class="draggable"
        draggable="true"
        @dragstart="dragStart"
      >
        <h3>{{ nodeAttr }}</h3>
        <svg
          :id="`node${nodeAttr}`"
          :height="svgHeight + 20"
          width="100%"
        />
        <br>
        <br>
      </div>

      <br>
      <br>

      <h2>Link Attributes</h2>
      <br>

      <div v-if="cleanedLinkVariables.size === 0">
        No link attributes to visualize
      </div>

      <div
        v-for="linkAttr of cleanedLinkVariables"
        v-else
        :id="`link${linkAttr}div`"
        :key="`link${linkAttr}`"
        class="draggable"
        draggable="true"
        @dragstart="dragStart"
      >
        <h3>{{ linkAttr }}</h3>
        <svg
          :id="`link${linkAttr}`"
          :height="svgHeight + 20"
          width="100%"
        />
        <br>
      </div>
    </div>
  </div>
</template>

<style scoped>
.v-card {
    height: calc(66vh - 24px);
    overflow-y: scroll
}
svg >>> text {
  text-anchor: start;
}
svg >>> .selected{
  stroke: "#000000";
}
.sticky {
   position: sticky;
   top: 0;
   z-index: 2;
}
.sticky >>> text {
  text-anchor: middle;
}
.barLabel {
  transform: translate(5%, 0);
}
#nodeMapping {
  transform: translate(20%, 50%);
}
#linkMapping {
  transform: translate(80%, 50%);
}
#barElements, #widthElements {
  transform: translate(-12%, -20%);
}
#glyphElements, #colorElements {
  transform: translate(2%, -20%);
}
.plus {
  transform: translate(5%, 20%);
  width: 5%;
}
.draggable {
  cursor: pointer;
}
</style>
