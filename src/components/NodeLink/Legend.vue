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
  },

  data() {
    return {
    };
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
      };
    },
    nodeColorClasses() {
      let classes = [];
      if (this.colorVariable != null) {
        if (this.colorVariable === "table") {
          classes = [...new Set(this.graphStructure.nodes.map(d => d.id.split("/")[0]))]
        } else {
          classes = [...new Set(this.graphStructure.nodes.map(d => d[this.colorVariable]))]
        }
      };
      return classes.sort((a, b) => a - b);
    },
    linkColorClasses() {
      let classes = [];
      if (this.linkColorVariable != null) {
          classes = [...new Set(this.graphStructure.links.map(d => d[this.linkColorVariable]))]
      };
      return classes.sort((a, b) => a - b);
    },
  },

  watch: {
    properties() {
      this.updateLegend();
    }
  },

  async mounted() {
    this.setUpLegend()
    this.updateLegend()
  },

  methods: {
    setUpLegend: function() {
      const legend = d3.select(this.$refs.legend)

      // Append groups for each type of information we'll need
      legend.append('g').classed('nodeColors', true)
      legend.append('g').classed('linkColors', true)
      legend.append('g').classed('linkWidth', true)
      legend.append('g').classed('nestedBars', true)
      legend.append('g').classed('nestedGlyphs', true)

      // Attach the legend headers
      legend
        .select('.nodeColors')
        .append('text')
        .text('Node Colors')
        .attr('x', 0)
        .attr('y', 15)

      legend
        .select('.linkColors')
        .append('text')
        .text('Link Colors')
        .attr('x', 0)
        .attr('y', 55)

      legend
        .select('.linkWidth')
        .append('text')
        .text('Link Width')
        .attr('x', 0)
        .attr('y', 85)

      legend
        .select('.nestedBars')
        .append('text')
        .text('Nested Bars')
        .attr('x', 0)
        .attr('y', 115)

      legend
        .select('.nestedGlyphs')
        .append('text')
        .text('Nested Glyphs')
        .attr('x', 0)
        .attr('y', 145)
    },

    updateLegend: function() {
      // available elements 
      //   this.graphStructure,
      //   this.provenance,
      //   this.app,
      //   this.nodeMarkerType,
      //   this.selectNeighbors,
      //   this.renderNested,
      //   this.labelVariable,
      //   this.colorVariable,
      //   this.nestedBarVariables,
      //   this.nestedGlyphVariables,
      //   this.linkWidthVariable,
      //   this.linkColorVariable,

      // Get the legend element
      const legend = d3.select(this.$refs.legend)

      // Set the nodeColors
      let nodeColors = legend
          .select('.nodeColors')
          .selectAll('rect')
          .data(this.nodeColorClasses)

      nodeColors
        .enter()
        .append('rect')
        .attr('x', (d, i) => 15*i)
        .attr('y', (d, i) => 30)
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', '#AAA')
        .merge(nodeColors)

      nodeColors
        .exit()
        .remove()

      console.log(this.nodeColorClasses)

      let nodeColorsLabels = legend
        .select('.nodeColors')
        .selectAll('.label')
        .data(this.nodeColorClasses)
      
      nodeColorsLabels
        .enter()
        .append('text')
        .text(d => d)
        .attr('x', (d, i) => (15*i) + 5)
        .attr('y', (d, i) => 24)
        .classed('label', true)
        .merge(nodeColorsLabels)

      nodeColorsLabels
        .exit()
        .remove()
      
      // Set the link colors
      let linkColors = legend
          .select('.linkColors')
          .selectAll('rect')
          .data(this.linkColorClasses)

      linkColors
        .enter()
        .append('rect')
        .attr('x', (d, i) => 15*i)
        .attr('y', (d, i) => 60)
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', '#AAA') // TODO: Make this match the actual link color
        .merge(linkColors)

      linkColors
        .exit()
        .remove()

      // If we have a link width variable add the scale to the legend
      if (this.linkWidthVariable != null) {
        
      }

      // If we have nested bar variables and nestedRender is on add the bars to the legend
      if (this.nestedBarVariables != [] && this.renderNested) {
        
      }

      // If we have nested glyph variables and nestedRender is on add the glyph to the legend
      if (this.nestedGlyphVariables != [] && this.renderNested) {
        
      }
    }
  }
};
</script>

<template>
  <div>
    <v-card>
      <v-card-title>Legend</v-card-title>
      <svg id="legend" class="col-12" ref="legend" height="165"/>
    </v-card>
  </div>
</template>

<style scoped>
.v-card {
    height: calc(25vh - 24px);
    overflow-y: scroll
  }
</style>
