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
    }
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
    },

    updateLegend: function() {
      // available elements 
      console.log(
        this.graphStructure,
        this.provenance,
        this.app,
        this.nodeMarkerType,
        this.selectNeighbors,
        this.renderNested,
        this.labelVariable,
        this.colorVariable,
        this.nestedBarVariables,
        this.nestedGlyphVariables,
        this.linkWidthVariable,
        this.linkColorVariable,
      )

      const legend = d3.select(this.$refs.legend)

      // If we have a node color variable add the options to the legend
      if (this.colorVariable != null) {

      }

      // If we have a link color variable add the options to the legend
      if (this.linkColorVariable != null) {
        
      }

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
      <svg id="legend" class="col-12" ref="legend" height="150" style="background-color: black;"/>
    </v-card>
  </div>
</template>

<style scoped>
.v-card {
    /* max-height: calc(100vh - 24px - 12px - 400px); */
    height: calc(25vh - 24px);
    overflow-y: scroll
  }
</style>
