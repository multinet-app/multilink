<script>
import { min, max } from 'd3-array';
import { select } from 'd3-selection';
import { scaleLinear, scaleBand } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { brushX } from 'd3-brush';

import { Network } from '@/types';

export default {
  components: {
  },

  props: {
    provenance: {
      type: Object,
      required: true,
    },
    graphStructure: {
      type: Network,
      default: null,
    },
    nodeColorScale: {
      type: Function,
      default: null,
    },
    linkColorScale: {
      type: Function,
      default: null,
    },
    glyphColorScale: {
      type: Function,
      default: null,
    },
    linkWidthScale: {
      type: Function,
      default: null,
    },
    multiVariableList: {
      type: Array,
      default: () => [],
    },
    linkVariableList: {
      type: Array,
      default: () => [],
    },
    barVariables: {
      type: Array,
      default: () => [],
    },
    glyphVariables: {
      type: Array,
      default: () => [],
    },
    widthVariables: {
      type: Array,
      default: () => [],
    },
    colorVariables: {
      type: Array,
      default: () => [],
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
        provenance,
        graphStructure,
        linkWidthScale,
        multiVariableList,
        linkVariableList,
        barVariables,
        glyphVariables,
        widthVariables,
        colorVariables,
      } = this;
      return {
        provenance,
        graphStructure,
        linkWidthScale,
        multiVariableList,
        linkVariableList,
        barVariables,
        glyphVariables,
        widthVariables,
        colorVariables,
      };
    },
  },

  mounted() {
    this.setUpPanel();
  },

  methods: {
    setUpPanel() {
      // For node and link variables
      for (const list of [this.multiVariableList, this.linkVariableList]) {
        // For each attribute
        for (const attr of list) {
          // Get the SVG element and its width
          const type = list === this.multiVariableList ? 'node' : 'link';
          const variableSvg = select(`#${type}${attr}`);
          const variableSvgWidth = variableSvg
            .node()
            .getBoundingClientRect()
            .width - this.yAxisPadding - this.varPadding;

          // Get the data and generate the bins
          const currentData = this.graphStructure[`${type}s`].map((d) => d[attr]);
          const bins = currentData.reduce((prev, curr) => (prev[curr] = ++prev[curr] || 1, prev), {});
          const binLabels = Object.entries(bins).map((d) => d[0]);
          const binValues = Object.entries(bins).map((d) => d[1]);

          // Generate axis scales
          const yScale = scaleLinear()
            .domain([min(binValues), max(binValues)])
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
          const variableSvgEnter = variableSvg
            .selectAll()
            .data(currentData)
            .enter()
            .append('rect')
            .attr('x', (d) => xScale(d))
            .attr('y', (d) => yScale(bins[d]))
            .attr('height', (d, i, values) => this.svgHeight - yScale(bins[d]))
            .attr('width', xScale.bandwidth())
            .attr('fill', (d) => (this.isQuantitative(attr, type) ? '#82B1FF' : this.nodeColorScale(d)));

          // Add the brush
          const brush = brushX()
            .extent([[this.yAxisPadding, 0], [variableSvgWidth, this.svgHeight]])
            .on('start brush', () => {
              const extent = event.selection;

              // Set the brush highlighting on the legend svg
              variableSvgEnter
                .attr('stroke', (d) => (xScale(d) >= extent[0] - xScale.bandwidth() && xScale(d) <= extent[1] ? '#000000' : ''));

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
              if (attr === this.widthVariables[0]) {
                const newDomain = [
                  this.ordinalInvert(extent[0], xScale, binLabels),
                  this.ordinalInvert(extent[1], xScale, binLabels),
                ];
                this.linkWidthScale.domain(newDomain).range([2, 20]);
              }

              // Update the link color domain
              if (attr === this.colorVariables[0]) {
                const start = binLabels.indexOf(this.ordinalInvert(extent[0], xScale, binLabels));
                const end = binLabels.indexOf(this.ordinalInvert(extent[1], xScale, binLabels));
                const newDomain = binLabels.slice(start, end);

                this.linkColorScale.domain(newDomain);
              }

              // Required because changing the domain of the brush doesn't trigger an update of the prop in controls.vue
              this.$root.$emit('brushing');
            });

          variableSvg
            .call(brush)
            .call(brush.move, xScale.range());
        }
      }
    },

    isQuantitative(varName, type) {
      const uniqueValues = [...new Set(this.graphStructure[`${type}s`].map((node) => parseFloat(node[varName])))];
      return uniqueValues.length > 5;
    },

    ordinalInvert(pos, scale, binLabels) {
      let previous = null;
      const domain = scale.domain();
      for (const idx in domain) {
        if (idx !== null) {
          if (scale(binLabels[idx]) > pos) {
            return previous;
          }
          previous = binLabels[idx];
        }
      }
      return previous;
    },

    rectDrop(newEvent) {
      const droppedEl = newEvent.dataTransfer.getData('attr_id');
      const type = droppedEl.substring(0, 4) === 'node' ? 'node' : 'link';
      const targetEl = newEvent.target.parentNode.id;
      const droppedElText = droppedEl.replace(type, '').replace('div', '');

      if (type === 'node' && targetEl === 'barElements') {
        this.barVariables.push(droppedElText);
      } else if (type === 'node' && targetEl === 'glyphElements') {
        this.glyphVariables.push(droppedElText);
      } else if (type === 'link' && targetEl === 'widthElements') {
        this.widthVariables.push(droppedElText);
      } else if (type === 'link' && targetEl === 'colorElements') {
        this.colorVariables.push(droppedElText);
      }
    },

    dragStart(newEvent) {
      newEvent.dataTransfer.setData('attr_id', newEvent.target.id);
    },
  },
};
</script>

<template>
  <div id="legend">
    <v-card>
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
              v-if="barVariables.length === 0"
              class="plus"
              d="M0,-10 V10 M-10,0 H10"
              stroke="black"
              stroke-width="3px"
            />
            <text
              v-for="(barVar, i) of barVariables"
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
              v-if="glyphVariables.length === 0"
              class="plus"
              d="M0,-10 V10 M-10,0 H10"
              stroke="black"
              stroke-width="3px"
            />
            <text
              v-for="(glyphVar, i) of glyphVariables"
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
              v-if="widthVariables.length === 0"
              class="plus"
              d="M0,-10 V10 M-10,0 H10"
              stroke="black"
              stroke-width="3px"
            />
            <text
              v-for="(widthVar, i) of widthVariables"
              :key="widthVar"
              :transform="`translate(0,${i * 15 + 15})`"
              dominant-baseline="hanging"
              style="text-anchor: start;"
              font-size="9pt"
            >{{ widthVar }}</text>
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
              v-if="colorVariables.length === 0"
              class="plus"
              d="M0,-10 V10 M-10,0 H10"
              stroke="black"
              stroke-width="3px"
            />
            <text
              v-for="(colorVar, i) of colorVariables"
              :key="colorVar"
              :transform="`translate(0,${i * 15 + 15})`"
              dominant-baseline="hanging"
              style="text-anchor: start;"
              font-size="9pt"
            >{{ colorVar }}</text>
          </g>
        </g>
      </svg>

      <!-- Variables to brush and to drag onto the sticky SVG -->
      <div :style="{'padding': `${this.varPadding}px`}">
        <h2>Node Attributes</h2>
        <br>
        <div
          v-for="nodeAttr of this.multiVariableList"
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
        <div
          v-for="linkAttr of this.linkVariableList"
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
    </v-card>
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
