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
        .range([this.sticky.barHeight, 0]);
      const axis = axisRight(scale).ticks(4, 's');

      select(`#node_${barVar}_scale`).append('g').call(axis);
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
      } else if (type === 'nodeSize') {
        store.commit.setNodeSizeVariable('');
      } else if (type === 'nodeColor') {
        store.commit.setNodeColorVariable('');
      } else if (type === 'linkWidth') {
        store.commit.setLinkVariables({
          width: '',
          color: this.linkVariables.color,
        });
      } else if (type === 'linkColor') {
        store.commit.setLinkVariables({
          width: this.linkVariables.width,
          color: '',
        });
      }
    },
  },
});
</script>

<template>
  <div id="legend">
    <!-- Sticky SVG to drag variables onto -->
    <svg
      class="sticky"
      :height="displayCharts ? 9 * sticky.rowHeight : 6 * sticky.rowHeight"
      width="100%"
    >

      <!-- Define some recurring elements -->
      <defs>
        <g id="plus">
          <rect
            :width="sticky.plusBackgroundSize"
            :height="sticky.plusBackgroundSize"
            fill="#FFFFFF"
          />
          <path
            d="M0,-10 V10 M-10,0 H10"
            stroke="black"
            stroke-width="2px"
            :transform="`translate(${sticky.plusBackgroundSize / 2}, ${sticky.plusBackgroundSize / 2})`"
          />
        </g>

        <g id="removeX">
          <rect
            width="16"
            height="16"
            fill="white"
          />
          <path
            d="M0,-10 V10 M-10,0 H10"
            stroke="black"
            stroke-width="2px"
            transform="translate(8,8)rotate(45)scale(.5)"
          />
        </g>
      </defs>

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
          :y="sticky.padding"
          :x="sticky.padding"
          dominant-baseline="hanging"
          text-anchor="start"
        >Node Mapping</text>

        <g
          v-if="displayCharts"
        >
          <!-- Bar adding elements -->
          <g
            :transform="`translate(${sticky.padding}, ${sticky.rowHeight})`"
          >
            <g
              v-for="(barVar, index) of nestedVariables.bar"
              :key="barVar"
            >
              <rect
                :x="index * sticky.barHorizSpacing"
                :width="sticky.barWidth"
                :height="sticky.barHeight"
                fill="#FFFFFF"
              />
              <rect
                :x="index * sticky.barHorizSpacing"
                y="50"
                :width="sticky.barWidth"
                height="50"
                :fill="nodeBarColorScale(barVar)"
              />
              <foreignObject
                :x="index * sticky.barHorizSpacing"
                :y="sticky.barHeight"
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
                :transform="`translate(${sticky.barWidth + (index * sticky.barHorizSpacing)}, 0)`"
              />
            </g>
            <g
              id="barElements"
              :transform="`translate(${nestedVariables.bar.length * sticky.barHorizSpacing}, 0)`"
              @dragenter="(e) => e.preventDefault()"
              @dragover="(e) => e.preventDefault()"
              @drop="rectDrop"
            >
              <use xlink:href="#plus" />
            </g>
          </g>

          <!-- Glyph adding elements -->
          <g
            :transform="`translate(${sticky.padding}, 180)`"
          >
            <text dominant-baseline="hanging">Glyph:</text>
            <g
              v-for="(glyphVar, outerIndex) of nestedVariables.glyph"
              :key="glyphVar"
            >
              <text
                :x="sticky.varNameIndent"
                :y="sticky.padding + outerIndex * (sticky.rowHeight + 10)"
              >
                {{ glyphVar }}
              </text>
              <g
                v-for="(glyphDatum, innerIndex) of attributeRanges[glyphVar].binLabels"
                :key="glyphDatum"
              >
                <rect
                  :x="sticky.varNameIndent + innerIndex * (sticky.colorMapSquareSize + 5)"
                  :y="(sticky.colorMapSquareSize + 5) + outerIndex * (sticky.rowHeight + 10)"
                  :width="sticky.colorMapSquareSize"
                  :height="sticky.colorMapSquareSize"
                  :fill="nodeGlyphColorScale(glyphDatum)"
                />
                <foreignObject
                  :x="sticky.varNameIndent + innerIndex * (sticky.colorMapSquareSize + 5)"
                  :y="30 + outerIndex * (sticky.rowHeight + 10)"
                  :width="sticky.colorMapSquareSize"
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
              :transform="`translate(${sticky.varNameIndent}, ${nestedVariables.glyph.length * (sticky.rowHeight + 10)})`"
              @dragenter="(e) => e.preventDefault()"
              @dragover="(e) => e.preventDefault()"
              @drop="rectDrop"
            >
              <use xlink:href="#plus" />
            </g>
          </g>
        </g>

        <g
          v-else
        >
          <!-- Node size elements -->
          <g
            :transform="`translate(${sticky.padding}, ${sticky.rowHeight})`"
          >
            <text dominant-baseline="hanging">Size:</text>
            <g
              v-if="nodeSizeVariable === ''"
              id="nodeSizeElements"
              :transform="`translate(${sticky.varNameIndent}, 0)`"
              @dragenter="(e) => e.preventDefault()"
              @dragover="(e) => e.preventDefault()"
              @drop="rectDrop"
            >
              <use xlink:href="#plus" />
            </g>

            <g v-else>
              <text
                :transform="`translate(${sticky.varNameIndent}, 0)`"
                dominant-baseline="hanging"
              >
                {{ nodeSizeVariable }}
              </text>
              <use
                xlink:href="#removeX"
                transform="translate(0, 15)"
                @click="removeMapping('nodeSize')"
              />
            </g>
          </g>

          <!-- Node color elements -->
          <g
            :transform="`translate(${sticky.padding}, ${2 * sticky.rowHeight})`"
          >
            <text dominant-baseline="hanging">Color:</text>
            <g
              v-if="nodeColorVariable === ''"
              id="nodeColorElements"
              :transform="`translate(${sticky.varNameIndent}, 0)`"
              @dragenter="(e) => e.preventDefault()"
              @dragover="(e) => e.preventDefault()"
              @drop="rectDrop"
            >
              <use xlink:href="#plus" />
            </g>

            <g v-else>
              <text
                :transform="`translate(${sticky.varNameIndent}, 0)`"
                dominant-baseline="hanging"
              >
                {{ nodeColorVariable }}
              </text>
              <g
                v-for="(glyphDatum, innerIndex) of attributeRanges[nodeColorVariable].binLabels"
                :key="glyphDatum"
              >
                <rect
                  :x="sticky.varNameIndent + innerIndex * (sticky.colorMapSquareSize + 5)"
                  :y="sticky.colorMapSquareSize + 5"
                  :width="sticky.colorMapSquareSize"
                  :height="sticky.colorMapSquareSize"
                  :fill="nodeGlyphColorScale(glyphDatum)"
                />
                <foreignObject
                  :x="sticky.varNameIndent + innerIndex * (sticky.colorMapSquareSize + 5)"
                  :y="30"
                  :width="sticky.colorMapSquareSize"
                  height="20"
                >
                  <p
                    class="glyphLabel"
                    :title="glyphDatum"
                  >
                    {{ glyphDatum }}
                  </p>
                </foreignObject>
                <use
                  xlink:href="#removeX"
                  transform="translate(0, 15)"
                  @click="removeMapping('nodeColor')"
                />
              </g>
            </g>
          </g>
        </g>
      </g>

      <!-- Link elements -->
      <g
        id="linkMapping"
        :transform="displayCharts ?
          `translate(${sticky.padding}, ${6 * sticky.rowHeight})` :
          `translate(${sticky.padding}, ${3 * sticky.rowHeight})`"
      >
        <text
          font-size="16pt"
          dominant-baseline="hanging"
          text-anchor="start"
        >Link Mapping</text>

        <!-- Link width elements -->
        <g :transform="`translate(0, ${sticky.varNameIndent - sticky.padding})`">
          <text dominant-baseline="hanging">Width:</text>
          <g
            v-if="linkVariables.width === ''"
            id="widthElements"
            :transform="`translate(${sticky.varNameIndent}, 0)`"
            @dragenter="(e) => e.preventDefault()"
            @dragover="(e) => e.preventDefault()"
            @drop="rectDrop"
          >
            <use xlink:href="#plus" />
          </g>

          <g v-else>
            <text
              :transform="`translate(${sticky.varNameIndent}, 0)`"
              dominant-baseline="hanging"
            >
              {{ linkVariables.width }}
            </text>
            <use
              xlink:href="#removeX"
              transform="translate(0, 15)"
              @click="removeMapping('linkWidth')"
            />
          </g>
        </g>

        <!-- Link color elements -->
        <g :transform="`translate(0, ${2 * sticky.varNameIndent - sticky.padding})`">
          <text dominant-baseline="hanging">Color:</text>
          <g
            v-if="linkVariables.color === ''"
            id="colorElements"
            :transform="`translate(${sticky.varNameIndent}, 0)`"
            @dragenter="(e) => e.preventDefault()"
            @dragover="(e) => e.preventDefault()"
            @drop="rectDrop"
          >
            <use xlink:href="#plus" />
          </g>

          <g v-else>
            <text
              :transform="`translate(${sticky.varNameIndent}, 0)`"
              dominant-baseline="hanging"
            >
              {{ linkVariables.color }}
            </text>
            <use
              xlink:href="#removeX"
              transform="translate(0, 15)"
              @click="removeMapping('linkColor')"
            />
            <g
              v-for="(glyphDatum, innerIndex) of attributeRanges[linkVariables.color].binLabels"
              :key="glyphDatum"
            >
              <rect
                :x="sticky.varNameIndent + innerIndex * (sticky.colorMapSquareSize + 5)"
                :y="20"
                :width="sticky.colorMapSquareSize"
                :height="sticky.colorMapSquareSize"
                :fill="nodeGlyphColorScale(glyphDatum)"
              />
              <foreignObject
                :x="sticky.varNameIndent + innerIndex * (sticky.colorMapSquareSize + 5)"
                :y="30"
                :width="sticky.colorMapSquareSize"
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
