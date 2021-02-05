<script lang="ts">
import Vue, { PropType } from 'vue';
import {
  min, max, histogram,
} from 'd3-array';
import { select } from 'd3-selection';
import {
  scaleLinear, scaleBand, ScaleBand,
} from 'd3-scale';
import { axisBottom, axisLeft, axisRight } from 'd3-axis';
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
      svgHeight: 50,
      yAxisPadding: 25, // Gives enough width for hundreds on the y axis
      stickyBarHeight: 100,
      stickyBarHorizSpacing: 60,
      stickyBarWidth: 30,
      stickyColorMapSquareSize: 15,
      stickyPadding: 15,
      stickyPlusBackgroundSize: 30,
      stickyRowHeight: 50,
      stickyVarNameIndent: 50,
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

    nodeSizeVariable() {
      return store.getters.nodeSizeVariable;
    },

    nodeColorVariable() {
      return store.getters.nodeColorVariable;
    },

    nodeBarColorScale() {
      return store.getters.nodeBarColorScale;
    },

    nodeGlyphColorScale() {
      return store.getters.nodeGlyphColorScale;
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

    displayCharts() {
      return store.getters.displayCharts;
    },

    attributeRanges() {
      return store.getters.attributeRanges;
    },
  },

  mounted() {
    this.setUpPanel();
  },

  methods: {
    setUpPanel() {
      // For node and link variables
      [this.cleanedNodeVariables as Set<string>, this.cleanedLinkVariables as Set<string>].forEach((list) => {
        // For each attribute
        list.forEach((attr) => {
          // Get the SVG element and its width
          const type = list === this.cleanedNodeVariables ? 'node' : 'link';
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

          // Process data for bars/histogram
          if (this.isQuantitative(attr, type)) {
            if (type === 'node') {
              currentData = this.graphStructure.nodes.map((d: Node | Link) => parseFloat(d[attr]));
            } else {
              currentData = this.graphStructure.edges.map((d: Node | Link) => parseFloat(d[attr]));
            }

            const xScale = scaleLinear()
              .domain([min(currentData), max(currentData) + 1])
              .range([this.yAxisPadding, variableSvgWidth]);

            const binGenerator = histogram()
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .domain((xScale as any).domain()) // then the domain of the graphic
              .thresholds(xScale.ticks(15)); // then the numbers of bins

            const bins = binGenerator(currentData);

            store.commit.addAttributeRange({
              attr,
              min: xScale.domain()[0] || 0,
              max: xScale.domain()[1] || 0,
              binLabels: xScale.domain().map((label) => label.toString()),
              binValues: xScale.range(),
            });

            const yScale = scaleLinear()
              .domain([0, max(bins, (d) => d.length) || 0])
              .range([this.svgHeight, 0]);

            variableSvg
              .selectAll('rect')
              .data(bins)
              .enter()
              .append('rect')
              .attr('x', (d) => xScale(d.x0 || 0))
              .attr('y', (d) => yScale(d.length))
              .attr('height', (d) => this.svgHeight - yScale(d.length))
              .attr('width', (d) => xScale(d.x1 || 0) - xScale(d.x0 || 0))
              .attr('fill', '#82B1FF');

            // Add the axis scales onto the chart
            variableSvg
              .append('g')
              .attr('transform', `translate(${this.yAxisPadding},0)`)
              .call(axisLeft(yScale).ticks(4, 's'));

            variableSvg
              .append('g')
              .attr('transform', `translate(0, ${this.svgHeight})`)
              .call(axisBottom(xScale).ticks(4, 's'));
          } else {
            if (type === 'node') {
              currentData = this.graphStructure.nodes.map((d: Node | Link) => d[attr]).sort();
            } else {
              currentData = this.graphStructure.edges.map((d: Node | Link) => d[attr]).sort();
            }

            const bins = new Map([...new Set(currentData)].map(
              (x) => [x, currentData.filter((y) => y === x).length],
            ));

            const binLabels: string[] = Array.from(bins.keys());
            const binValues: number[] = Array.from(bins.values());

            store.commit.addAttributeRange({
              attr,
              min: parseFloat(min(binLabels) || '0'),
              max: parseFloat(max(binLabels) || '0'),
              binLabels,
              binValues,
            });

            // Generate axis scales
            const yScale = scaleLinear()
              .domain([min(binValues) || 0, max(binValues) || 0])
              .range([this.svgHeight, 0]);

            const xScale = scaleBand()
              .domain(binLabels)
              .range([this.yAxisPadding, variableSvgWidth]);

            variableSvg
              .selectAll('rect')
              .data(currentData)
              .enter()
              .append('rect')
              .attr('x', (d: string) => xScale(d) || 0)
              .attr('y', (d: string) => yScale(bins.get(d) || 0))
              .attr('height', (d: string) => this.svgHeight - yScale(bins.get(d) || 0))
              .attr('width', xScale.bandwidth())
              .attr('fill', (d: string) => this.nodeGlyphColorScale(d));

            // Add the axis scales onto the chart
            variableSvg
              .append('g')
              .attr('transform', `translate(${this.yAxisPadding},0)`)
              .call(axisLeft(yScale).ticks(4, 's'));

            variableSvg
              .append('g')
              .attr('transform', `translate(0, ${this.svgHeight})`)
              .call(axisBottom(xScale).ticks(4, 's'));
          }
        });
      });
    },

    // TODO: https://github.com/multinet-app/multilink/issues/176
    // use table name for var selection
    isQuantitative(varName: string, type: 'node' | 'link') {
      if (Object.keys(this.columnTypes).length > 0) {
        return this.columnTypes[varName] === 'number';
      }

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

        // Render the scales
        Vue.nextTick(() => this.renderScales(droppedElText));
      } else if (type === 'node' && targetEl === 'glyphElements') {
        const updatedNestedVars = {
          bar: this.nestedVariables.bar,
          glyph: [...this.nestedVariables.glyph, droppedElText],
        };
        store.commit.setNestedVariables(updatedNestedVars);
      } else if (type === 'node' && targetEl === 'nodeSizeElements') {
        store.commit.setNodeSizeVariable(droppedElText);
      } else if (type === 'node' && targetEl === 'nodeColorElements') {
        store.commit.setNodeColorVariable(droppedElText);
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

    renderScales(barVar: string) {
      const varMin = this.attributeRanges[barVar].min;
      const varMax = this.attributeRanges[barVar].max;

      const scale = scaleLinear()
        .domain([varMin, varMax])
        .range([this.stickyBarHeight, 0]);
      const axis = axisRight(scale).ticks(4, 's');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      select(`#node_${barVar}_scale`).call((axis as any));
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
      :height="displayCharts ? 9 * stickyRowHeight : 6 * stickyRowHeight"
      width="100%"
    >
      <rect
        width="100%"
        height="440"
        fill="#DDDDDD"
        opacity="1"
      />

      <!-- Node elements when displayCharts === true -->
      <g
        id="nodeMapping"
      >
        <text
          font-size="16pt"
          :y="stickyPadding"
          :x="stickyPadding"
          dominant-baseline="hanging"
          text-anchor="start"
        >Node Mapping</text>

        <g
          v-if="displayCharts"
        >
          <!-- Bar adding elements -->
          <g
            :transform="`translate(${stickyPadding}, ${stickyRowHeight})`"
          >
            <g
              v-for="(barVar, index) of nestedVariables.bar"
              :key="barVar"
            >
              <rect
                :x="index * stickyBarHorizSpacing"
                :width="stickyBarWidth"
                :height="stickyBarHeight"
                fill="#FFFFFF"
              />
              <rect
                :x="index * stickyBarHorizSpacing"
                y="50"
                :width="stickyBarWidth"
                height="50"
                :fill="nodeBarColorScale(barVar)"
              />
              <foreignObject
                :x="index * stickyBarHorizSpacing"
                :y="stickyBarHeight"
                width="50"
                height="20"
              >
                <p
                  class="barLabel"
                  :title="barVar"
                >
                  {{ barVar }}
                </p>
              </foreignObject>
              <g
                :id="`node_${barVar}_scale`"
                :transform="`translate(${stickyBarWidth + (index * stickyBarHorizSpacing)}, 0)`"
              />
            </g>
            <g
              id="barElements"
              :transform="`translate(${nestedVariables.bar.length * stickyBarHorizSpacing}, 0)`"
              @dragenter="(e) => e.preventDefault()"
              @dragover="(e) => e.preventDefault()"
              @drop="rectDrop"
            >
              <rect
                :width="stickyPlusBackgroundSize"
                :height="stickyBarHeight"
                fill="#FFFFFF"
              />
              <path
                d="M0,-10 V10 M-10,0 H10"
                stroke="black"
                stroke-width="2px"
                :transform="`translate(${stickyPlusBackgroundSize / 2}, 50)`"
              />
            </g>
          </g>

          <!-- Glyph adding elements -->
          <g
            :transform="`translate(${stickyPadding}, 180)`"
          >
            <text dominant-baseline="hanging">Glyph:</text>
            <g
              v-for="(glyphVar, outerIndex) of nestedVariables.glyph"
              :key="glyphVar"
            >
              <text
                :x="stickyVarNameIndent"
                :y="stickyPadding + outerIndex * (stickyRowHeight + 10)"
              >
                {{ glyphVar }}
              </text>
              <g
                v-for="(glyphDatum, innerIndex) of attributeRanges[glyphVar].binLabels"
                :key="glyphDatum"
              >
                <rect
                  :x="stickyVarNameIndent + innerIndex * (stickyColorMapSquareSize + 5)"
                  :y="(stickyColorMapSquareSize + 5) + outerIndex * (stickyRowHeight + 10)"
                  :width="stickyColorMapSquareSize"
                  :height="stickyColorMapSquareSize"
                  :fill="nodeGlyphColorScale(glyphDatum)"
                />
                <foreignObject
                  :x="stickyVarNameIndent + innerIndex * (stickyColorMapSquareSize + 5)"
                  :y="30 + outerIndex * (stickyRowHeight + 10)"
                  :width="stickyColorMapSquareSize"
                  height="20"
                >
                  <p
                    class="glyphLabel"
                    :title="glyphDatum"
                  >
                    {{ glyphDatum }}
                  </p>
                </foreignObject>
              </g>
            </g>
            <g
              v-if="nestedVariables.glyph.length !== 2"
              id="glyphElements"
              :transform="`translate(${stickyVarNameIndent}, ${nestedVariables.glyph.length * (stickyRowHeight + 10)})`"
              @dragenter="(e) => e.preventDefault()"
              @dragover="(e) => e.preventDefault()"
              @drop="rectDrop"
            >
              <rect
                :width="stickyPlusBackgroundSize"
                :height="stickyPlusBackgroundSize"
                fill="#FFFFFF"
              />
              <path
                d="M0,-10 V10 M-10,0 H10"
                stroke="black"
                stroke-width="2px"
                :transform="`translate(${stickyPlusBackgroundSize / 2}, ${stickyPlusBackgroundSize / 2})`"
              />
            </g>
          </g>
        </g>

        <g
          v-else
        >
          <!-- Node size elements -->
          <g
            :transform="`translate(${stickyPadding}, ${stickyRowHeight})`"
          >
            <text dominant-baseline="hanging">Size:</text>
            <g
              v-if="nodeSizeVariable === ''"
              id="nodeSizeElements"
              :transform="`translate(${stickyVarNameIndent}, 0)`"
              @dragenter="(e) => e.preventDefault()"
              @dragover="(e) => e.preventDefault()"
              @drop="rectDrop"
            >
              <rect
                :width="stickyPlusBackgroundSize"
                :height="stickyPlusBackgroundSize"
                fill="#FFFFFF"
              />
              <path
                d="M0,-10 V10 M-10,0 H10"
                stroke="black"
                stroke-width="2px"
                :transform="`translate(${stickyPlusBackgroundSize / 2}, ${stickyPlusBackgroundSize / 2})`"
              />
            </g>

            <g v-else>
              <text
                :transform="`translate(${stickyVarNameIndent}, 0)`"
                dominant-baseline="hanging"
              >
                {{ nodeSizeVariable }}
              </text>
            </g>
          </g>

          <!-- Node color elements -->
          <g
            :transform="`translate(${stickyPadding}, ${2 * stickyRowHeight})`"
          >
            <text dominant-baseline="hanging">Color:</text>
            <g
              v-if="nodeColorVariable === ''"
              id="nodeColorElements"
              :transform="`translate(${stickyVarNameIndent}, 0)`"
              @dragenter="(e) => e.preventDefault()"
              @dragover="(e) => e.preventDefault()"
              @drop="rectDrop"
            >
              <rect
                :width="stickyPlusBackgroundSize"
                :height="stickyPlusBackgroundSize"
                fill="#FFFFFF"
              />
              <path
                d="M0,-10 V10 M-10,0 H10"
                stroke="black"
                stroke-width="2px"
                :transform="`translate(${stickyPlusBackgroundSize / 2}, ${stickyPlusBackgroundSize / 2})`"
              />
            </g>

            <g v-else>
              <text
                :transform="`translate(${stickyVarNameIndent}, 0)`"
                dominant-baseline="hanging"
              >
                {{ nodeColorVariable }}
              </text>
              <g
                v-for="(glyphDatum, innerIndex) of attributeRanges[nodeColorVariable].binLabels"
                :key="glyphDatum"
              >
                <rect
                  :x="stickyVarNameIndent + innerIndex * (stickyColorMapSquareSize + 5)"
                  :y="stickyColorMapSquareSize + 5"
                  :width="stickyColorMapSquareSize"
                  :height="stickyColorMapSquareSize"
                  :fill="nodeGlyphColorScale(glyphDatum)"
                />
                <foreignObject
                  :x="stickyVarNameIndent + innerIndex * (stickyColorMapSquareSize + 5)"
                  :y="30"
                  :width="stickyColorMapSquareSize"
                  height="20"
                >
                  <p
                    class="glyphLabel"
                    :title="glyphDatum"
                  >
                    {{ glyphDatum }}
                  </p>
                </foreignObject>
              </g>
            </g>
          </g>
        </g>
      </g>

      <!-- Link elements -->
      <g
        id="linkMapping"
        :transform="displayCharts ?
          `translate(${stickyPadding}, ${6 * stickyRowHeight})` :
          `translate(${stickyPadding}, ${3 * stickyRowHeight})`"
      >
        <text
          font-size="16pt"
          dominant-baseline="hanging"
          text-anchor="start"
        >Link Mapping</text>

        <!-- Link width elements -->
        <g :transform="`translate(0, ${stickyVarNameIndent - stickyPadding})`">
          <text dominant-baseline="hanging">Width:</text>
          <g
            v-if="linkVariables.width === ''"
            id="widthElements"
            :transform="`translate(${stickyVarNameIndent}, 0)`"
            @dragenter="(e) => e.preventDefault()"
            @dragover="(e) => e.preventDefault()"
            @drop="rectDrop"
          >
            <rect
              :width="stickyPlusBackgroundSize"
              :height="stickyPlusBackgroundSize"
              fill="#FFFFFF"
            />
            <path
              d="M0,-10 V10 M-10,0 H10"
              stroke="black"
              stroke-width="2px"
              :transform="`translate(${stickyPlusBackgroundSize / 2}, ${stickyPlusBackgroundSize / 2})`"
            />
          </g>

          <g v-else>
            <text
              :transform="`translate(${stickyVarNameIndent}, 0)`"
              dominant-baseline="hanging"
            >
              {{ linkVariables.width }}
            </text>
          </g>
        </g>

        <!-- Link color elements -->
        <g :transform="`translate(0, ${2 * stickyVarNameIndent - stickyPadding})`">
          <text dominant-baseline="hanging">Color:</text>
          <g
            v-if="linkVariables.color === ''"
            id="colorElements"
            :transform="`translate(${stickyVarNameIndent}, 0)`"
            @dragenter="(e) => e.preventDefault()"
            @dragover="(e) => e.preventDefault()"
            @drop="rectDrop"
          >
            <rect
              :width="stickyPlusBackgroundSize"
              :height="stickyPlusBackgroundSize"
              fill="#FFFFFF"
            />
            <path
              d="M0,-10 V10 M-10,0 H10"
              stroke="black"
              stroke-width="2px"
              transform="translate(15,15)"
            />
          </g>

          <g v-else>
            <text
              :transform="`translate(${stickyVarNameIndent}, 0)`"
              dominant-baseline="hanging"
            >
              {{ linkVariables.color }}
            </text>
            <g
              v-for="(glyphDatum, innerIndex) of attributeRanges[linkVariables.color].binLabels"
              :key="glyphDatum"
            >
              <rect
                :x="stickyVarNameIndent + innerIndex * (stickyColorMapSquareSize + 5)"
                :y="20"
                :width="stickyColorMapSquareSize"
                :height="stickyColorMapSquareSize"
                :fill="nodeGlyphColorScale(glyphDatum)"
              />
              <foreignObject
                :x="stickyVarNameIndent + innerIndex * (stickyColorMapSquareSize + 5)"
                :y="30"
                :width="stickyColorMapSquareSize"
                height="20"
              >
                <p
                  class="glyphLabel"
                  :title="glyphDatum"
                >
                  {{ glyphDatum }}
                </p>
              </foreignObject>
            </g>
          </g>
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
      </div>

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
.sticky {
  position: sticky;
  top: 0;
  z-index: 2;
}
.draggable {
  cursor: pointer;
}
.barLabel, .glyphLabel{
  display: block;
  max-width: 50px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
