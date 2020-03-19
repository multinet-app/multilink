<script>
import * as d3 from "d3";

export default {
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
    labelVariable: {
      type: String,
      default: "_key"
    },
    colorVariable: {
      type: String,
      default: "table"
    },
    linkWidthVariable: {
      type: String,
      default: null
    },
    linkColorVariable: {
      type: String,
      default: null
    },
    nodeMarkerType: {
      type: String,
      default: "Circle"
    },
    selectNeighbors: {
      type: Boolean,
      default: true
    },
    renderNested: {
      type: Boolean,
      default: false
    },
    nestedBarVariables: {
      type: Array,
      default: () => [],
      validator: (prop) => prop.every((item) => typeof item === 'string'),
    },
    nestedGlyphVariables: {
      type: Array,
      default: () => [],
      validator: (prop) => prop.every((item) => typeof item === 'string'),
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
      svgHeight: 100
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
        nodeMarkerType,
        selectNeighbors,
        renderNested,
        labelVariable,
        colorVariable,
        nestedBarVariables,
        nestedGlyphVariables,
        linkWidthVariable,
        linkColorVariable,
        multiVariableList,
        linkVariableList,
      } = this;
      return {
        graphStructure,
        provenance,
        app,
        nodeMarkerType,
        selectNeighbors,
        renderNested,
        labelVariable,
        colorVariable,
        nestedBarVariables,
        nestedGlyphVariables,
        linkWidthVariable,
        linkColorVariable,
        multiVariableList,
        linkVariableList,
      };
    },
  },

  methods: {
    setUpPanel() {
      for (const nodeAttr of this.multiVariableList) {
        // Get the SVG element and its width
        const variableSvg = d3.select(`#node${nodeAttr}`)
        const variableSvgWidth = variableSvg.node().getBoundingClientRect().width

        // Get the data and generate the bins
        const currentData = this.graphStructure.nodes.map(d => d[nodeAttr])
        const bins = currentData.reduce((prev, curr) => (prev[curr] = ++prev[curr] || 1, prev), {})
        const binLabels = Object.entries(bins).map(d => d[0])
        const binValues = Object.entries(bins).map(d => d[1])

        // Generate axis scales
        const yScale = d3.scaleLinear()
          .range([this.svgHeight, 0])
          .domain([d3.min(binValues), d3.max(binValues)]);

        const xScale = d3.scaleBand()
          .range([0, variableSvgWidth])
          .domain(binLabels);

        // Add the axis scales onto the chart
        variableSvg
          .append('g')
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
          .attr('fill', this.isQuantitative(nodeAttr) ? this.nodeColorScale(d) : '#82B1FF');

        // Add the brush
        variableSvg
          .call(
            d3.brushX()
              .extent([[0, 0], [variableSvgWidth, this.svgHeight]])
              .on("start brush", () => {
                const extent = d3.event.selection;
                console.log(extent)
                variableSvgEnter
                  .attr("stroke", d => xScale(d) >= extent[0] - xScale.bandwidth() && xScale(d) <= extent[1] ? "#000000" : "")
              })
          );
      }
    },

    isQuantitative(attr) {
      return false
    },
  }
};
</script>

<template>
  <div>
    <v-card>
      <v-list disabled>
        <v-list-item-group>
          <v-subheader>Node Attributes</v-subheader>
          <v-list-item
            v-for="(nodeAttr, index) of this.multiVariableList"
            :key="'node' + nodeAttr"
          >
            <v-list-item-content>
              <v-list-item-title v-text="nodeAttr + index"></v-list-item-title>
              <br/>

              <svg :id="'node' + nodeAttr" :height="svgHeight + 20"/>
            </v-list-item-content>
          </v-list-item>

          <v-subheader>Link Attributes</v-subheader>
          <v-list-item
            v-for="(linkAttr, index) of this.linkVariableList"
            :key="'link' + linkAttr"
          >
            <v-list-item-content>
              <v-list-item-title v-text="linkAttr + index"></v-list-item-title>
              <br/>
              <svg :id="'link' + linkAttr" :height="svgHeight + 20"/>
            </v-list-item-content>
          </v-list-item>

        </v-list-item-group>
      </v-list>
    </v-card>
  </div>
</template>

<style scoped>
.v-card {
    height: calc(50vh - 24px);
    overflow-y: scroll
}
svg >>> text {
  text-anchor: start;
}
svg >>> .selected{
  stroke: "#000000";
}
</style>
