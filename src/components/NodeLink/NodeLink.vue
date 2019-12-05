<script>
import * as d3 from "d3";

import * as loadVisMethods from './functionLoadVis';
import * as updateVisMethods from './functionUpdateVis';
import * as uiMethods from './functionUi';

console.log(updateVisMethods);

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
    nodeLabel: {
      type: String,
      default: "id"
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
        nodeFill: "table"
      })
    },
    simOn: {
      type: Boolean,
      default: false,
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
      nodeColors: ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854"],
      edgeColor: "#888888",
      nodeSizeAttr: undefined,
      drawBars: undefined,
      barPadding: 3,
      straightEdges: false,
      // distinguish a drag from a click
      wasDragged: false,
    };
  },

  async mounted() {
    /**
     * mounted hook runs after the component is injected into the DOM
     */
    this.loadVis();
    this.provenance.addObserver("selected", state =>
      this.highlightSelectedNodes(state)
    );
  },

  methods: {
    // define many functions externally
    ...loadVisMethods,
    ...updateVisMethods,
    ...uiMethods,
  },

  computed: {
    properties() {
      const {
        graphStructure,
        nodeLabel,
        nodeFontSize,
        nodeMarkerLength,
        nodeMarkerHeight,
        isDirected,
        isMultiEdge,
        attributes,
      } = this;
      return {
        graphStructure,
        nodeLabel,
        nodeFontSize,
        nodeMarkerLength,
        nodeMarkerHeight,
        isDirected,
        isMultiEdge,
        attributes,
      };
    }
  },

  watch: {
    properties() {
      this.updateVis();
    }
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
