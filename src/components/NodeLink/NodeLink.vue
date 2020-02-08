<script>
import * as d3 from "d3";

import * as loadVisMethods from './functionLoadVis';
import * as updateVisMethods from './functionUpdateVis';
import * as uiMethods from './functionUi';

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
  },

  data() {
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
      wasDragged: false,
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
    this.loadVis();
    this.provenance.addObserver("selected", state =>
      this.highlightSelectedNodes(state)
    );

    this.simulation = this.makeSimulation()
  },

  methods: {
    ...loadVisMethods,
    ...updateVisMethods,
    ...uiMethods,
  },
};
</script>

<template>
  <svg ref="svg" width="800" height="900"/>
</template>

<style scoped>
@import './NodeLink.css';
</style>
