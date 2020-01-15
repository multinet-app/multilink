<script>
import * as d3 from "d3";

import * as loadVisMethods from './functionLoadVis';
import * as updateVisMethods from './functionUpdateVis';
import * as uiMethods from './functionUi';

export default {
  props: {
    /**
     * props define properties that should be controlled by
     * the users or will need to be modified externally.
     */
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
    nodeFontSize: {
      type: Number,
      default: 14
    },
    nodeMarkerLength: {
      type: Number,
      default: 50
    },
    nodeMarkerHeight: {
      type: Number,
      default: 50
    },
    nodeMarkerType: {
      type: String,
      default: "Circle"
    },
    selectNeighbors: {
      type: Boolean,
      default: true
    },
    isDirected: {
      type: Boolean,
      default: false
    },
    isMultiEdge: {
      type: Boolean,
      default: false
    },
    attributes: {
      type: Object,
      default: () => ({
        edgeWidthKey: undefined,
      })
    },
    renderNested: {
      type: Boolean,
      default: false
    },
    nestedBarVariables: {
      type: Array,
      default: () => []
    },
    nestedGlyphVariables: {
      type: Array,
      default: () => []
    },
  },

  data() {
    /**
     * data defines internal state that no external sources
     * should modify.
     */
    return {
      browser: {
        height: 0,
        width: 0
      },
      panelDimensions: { width: 0, height: 0 },
      visDimensions: { width: 0, height: 0 },
      visMargins: {
        left: 25,
        right: 25,
        top: 25,
        bottom: 25
      },
      svg: undefined,
      simulation: undefined,
      scales: {},
      edgeScale: d3.scaleLinear().domain([0, 1]),
      circleScale: d3.scaleLinear().domain([0, 1]),
      colorClasses: [],
      nodeSizeAttr: undefined,
      barPadding: 3,
      straightEdges: false,
      // distinguish a drag from a click
      wasDragged: false,
      nodeColorScale: d3.scaleOrdinal(d3.schemeCategory10),
      linkColorScale: d3.scaleOrdinal(d3.schemeCategory10),
    };
  },

  computed: {
    properties() {
      const {
        graphStructure,
        nodeFontSize,
        nodeMarkerLength,
        nodeMarkerHeight,
        nodeMarkerType,
        isDirected,
        isMultiEdge,
        attributes,
        renderNested,
        linkWidthVariable,
        linkColorVariable,
        labelVariable,
        colorVariable,
        nestedBarVariables,
        nestedGlyphVariables,
      } = this;
      return {
        graphStructure,
        nodeFontSize,
        nodeMarkerLength,
        nodeMarkerHeight,
        nodeMarkerType,
        isDirected,
        isMultiEdge,
        attributes,
        renderNested,
        linkWidthVariable,
        linkColorVariable,
        labelVariable,
        colorVariable,
        nestedBarVariables,
        nestedGlyphVariables,
      };
    },
    linkWidthScale() {
      return d3.scaleLinear()
        .domain(
          [
            d3.min(this.graphStructure.links.map(d => d[this.linkWidthVariable])),
            d3.max(this.graphStructure.links.map(d => d[this.linkWidthVariable]))
          ]
        )
        .range([2, 20])
    },
  },

  watch: {
    properties() {
      this.updateVis();
    }
  },

  async mounted() {
    /**
     * mounted hook runs after the component is injected into the DOM
     */
    this.loadVis();
    this.provenance.addObserver("selected", state =>
      this.highlightSelectedNodes(state)
    );

    this.simulation = this.makeSimulation()
  },

  methods: {
    // define many functions externally
    ...loadVisMethods,
    ...updateVisMethods,
    ...uiMethods,
  },
};
</script>

<template>
  <div>
    <svg ref="svg" width="800" height="900"/>
  </div>
</template>

<style scoped>
@import './NodeLink.css';
</style>
