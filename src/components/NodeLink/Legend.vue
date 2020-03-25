<script>
import * as d3 from "d3";

export default {
  components: {
  },

  props: {
    app: {
      type: Object,
      required: true
    },
    provenance: {
      type: Object,
      required: true
    },
    graphStructure: {
      type: Object,
      default: () => {}
    },
    nodeColorScale: {
      type: Function,
      default: null
    },
    linkColorScale: {
      type: Function,
      default: null
    },
    glyphColorScale: {
      type: Function,
      default: null
    },
    linkWidthScale: {
      type: Function,
      default: null
    },
    multiVariableList: {
      type: Array,
      default: () => [],
    },
    linkVariableList: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {
      svgHeight: 150,
      yAxisPadding: 10,
      varPadding: 10
    };
  },

  mounted() {
    this.setUpPanel()
  },

  computed: {
    properties() {
      const {
        graphStructure,
        provenance,
        app,
        multiVariableList,
        linkVariableList,
      } = this;
      return {
        graphStructure,
        provenance,
        app,
        multiVariableList,
        linkVariableList,
      };
    },
  },

  methods: {
    setUpPanel() {
      // For node and link variables
      for (const list of [this.multiVariableList, this.linkVariableList]) {
        // For each attribute
        for (const attr of list) {
          // Get the SVG element and its width
          const type = list === this.multiVariableList ? "node" : "link"
          const variableSvg = d3.select(`#${type}${attr}`)
          const variableSvgWidth = variableSvg.node().getBoundingClientRect().width - this.yAxisPadding - this.varPadding

          // Get the data and generate the bins
          const currentData = this.graphStructure[`${type}s`].map(d => d[attr])
          const bins = currentData.reduce((prev, curr) => (prev[curr] = ++prev[curr] || 1, prev), {})
          const binLabels = Object.entries(bins).map(d => d[0])
          const binValues = Object.entries(bins).map(d => d[1])

          // Generate axis scales
          const yScale = d3.scaleLinear()
            .range([this.svgHeight, 0])
            .domain([d3.min(binValues), d3.max(binValues)]);

          const xScale = d3.scaleBand()
            .range([this.yAxisPadding, variableSvgWidth])
            .domain(binLabels);

          // Add the axis scales onto the chart
          variableSvg
            .append('g')
            .attr('transform', `translate(${this.yAxisPadding},0)`)
            .call(d3.axisLeft(yScale));

          variableSvg
            .append('g')
            .attr('transform', `translate(0, ${this.svgHeight})`)
            .call(d3.axisBottom(xScale));

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
            .attr('fill', d => this.isQuantitative(attr, type) ? '#82B1FF' : this.nodeColorScale(d));

          // Add the brush
          const brush = d3.brushX()
            .extent([[this.yAxisPadding, 0], [variableSvgWidth, this.svgHeight]])
            .on("start brush", () => {
              const extent = d3.event.selection;
              variableSvgEnter
                .attr("stroke", d => xScale(d) >= extent[0] - xScale.bandwidth() && xScale(d) <= extent[1] ? "#000000" : "")
            })

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

    rectDrop(event) {
      const droppedEl = event.dataTransfer.getData('attr_id')
      console.log(droppedEl)
    },

    dragStart(event) {
      event.dataTransfer.setData('attr_id', event.target.id)
    }
  }
};
</script>

<template>
  <div id="legend">
    <v-card>
      <!-- Sticky SVG to drag variables onto -->
      <svg class="sticky" height="33%" width="100%">
        <rect width="100%" height="100%" fill="#DDDDDD" opacity="1"/>

        <!-- Node elements -->
        <g id="nodeMapping">
          <text font-size="16pt" y ="-132" dominant-baseline="hanging">Node Mapping</text>
          <circle r="100" fill="#82B1FF"/>

          <!-- Bar adding elements -->
          <g id="barElements">
            <rect width="10%" height="40%" fill="#EEEEEE" 
              @dragenter="(e) => e.preventDefault()" 
              @dragover="(e) => e.preventDefault()" 
              @drop="rectDrop"
            />
            <text class="barLabel" font-size="10pt" dominant-baseline="hanging">Bars</text>
            <path class="plus" width="5%" d='M0,-10 V10 M-10,0 H10' stroke="black" stroke-width="3px"/>
          </g>

          <!-- Glyph adding elements -->
          <g id="glyphElements">
            <rect width="10%" height="40%" fill="#EEEEEE" 
              @dragenter="(e) => e.preventDefault()" 
              @dragover="(e) => e.preventDefault()" 
              @drop="rectDrop"
            />
            <text class="barLabel" font-size="10pt" dominant-baseline="hanging">Glyphs</text>
            <path class="plus" width="5%" d='M0,-10 V10 M-10,0 H10' stroke="black" stroke-width="3px"/>
          </g>
        </g>
        
        <!-- Link elements -->
        <g id="linkMapping">
          <text font-size="16pt" y ="-132" dominant-baseline="hanging">Link Mapping</text>
          <rect x="-100" y ="-100" width="200" height="200" fill="#82B1FF"/>

          <!-- Color adding elements -->
          <g id="barElements">
            <rect width="10%" height="40%" fill="#EEEEEE" 
              @dragenter="(e) => e.preventDefault()" 
              @dragover="(e) => e.preventDefault()" 
              @drop="rectDrop"
            />
            <text class="barLabel" font-size="10pt" dominant-baseline="hanging">Width</text>
            <path class="plus" width="5%" d='M0,-10 V10 M-10,0 H10' stroke="black" stroke-width="3px"/>
          </g>

          <!-- Width adding elements -->
          <g id="glyphElements">
            <rect width="10%" height="40%" fill="#EEEEEE" 
              @dragenter="(e) => e.preventDefault()" 
              @dragover="(e) => e.preventDefault()" 
              @drop="rectDrop"
            />
            <text class="barLabel" font-size="10pt" dominant-baseline="hanging">Color</text>
            <path class="plus" width="5%" d='M0,-10 V10 M-10,0 H10' stroke="black" stroke-width="3px"/>
          </g>
        </g>
      </svg>

      <!-- Variables to brush and to drag onto the sticky SVG -->
      <div :style="{'padding': `${this.varPadding}px`}">
        <h2>Node Attributes</h2>
        <br/>
        <div
          v-for="nodeAttr of this.multiVariableList"
          :key="`node${nodeAttr}`"
          :id="`node${nodeAttr}div`"
          draggable="true"
          @dragstart="dragStart"
        >
          <h3>{{nodeAttr}}</h3>
          <svg :id="`node${nodeAttr}`" :height="svgHeight + 20" width="100%"/>
          <br/>
          <br/>
        </div>

        <br/>
        <br/>

        <h2>Link Attributes</h2>
        <br/>
        <div
          v-for="linkAttr of this.linkVariableList"
          :key="`link${linkAttr}`"
          :id="`link${linkAttr}div`"
          draggable="true"
          @dragstart="dragStart"
        >
          <h3>{{linkAttr}}</h3>
          <svg :id="`link${linkAttr}`" :height="svgHeight + 20" width="100%"/>
          <br/>
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
#barElements { 
  transform: translate(-12%, -20%);
}
#glyphElements {
  transform: translate(2%, -20%);
}
.plus {
  transform: translate(5%, 20%);
}
</style>
