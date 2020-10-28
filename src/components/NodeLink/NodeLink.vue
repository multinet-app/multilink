<script>
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import { Network } from '@/types';
import * as updateVisMethods from './functionUpdateVis';

export default {
  props: {
    provenance: {
      type: Object,
      required: true,
    },
    graphStructure: {
      type: Network,
      default: null,
    },
    labelVariable: {
      type: String,
      default: '_key',
    },
    colorVariable: {
      type: String,
      default: 'table',
    },
    nodeFontSize: {
      type: Number,
      default: 14,
    },
    selectNeighbors: {
      type: Boolean,
      default: true,
    },
    isDirected: {
      type: Boolean,
      default: false,
    },
    isMultiEdge: {
      type: Boolean,
      default: false,
    },
    attributes: {
      type: Object,
      default: () => ({
        edgeWidthKey: undefined,
      }),
    },
    renderNested: {
      type: Boolean,
      default: false,
    },
    barVariables: {
      type: Array,
      default: () => [],
      validator: (prop) => prop.every((item) => typeof item === 'string'),
    },
    glyphVariables: {
      type: Array,
      default: () => [],
      validator: (prop) => prop.every((item) => typeof item === 'string'),
    },
    widthVariables: {
      type: Array,
      default: () => [],
      validator: (prop) => prop.every((item) => typeof item === 'string'),
    },
    colorVariables: {
      type: Array,
      default: () => [],
      validator: (prop) => prop.every((item) => typeof item === 'string'),
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
  },

  data() {
    return {
      browser: {
        height: 0,
        width: 0,
      },
      panelDimensions: { width: 0, height: 0 },
      visDimensions: { width: 0, height: 0 },
      visMargins: {
        left: 25,
        right: 25,
        top: 25,
        bottom: 25,
      },
      svg: undefined,
      simulation: undefined,
      scales: {},
      edgeScale: scaleLinear().domain([0, 1]),
      colorClasses: [],
      nodeSizeAttr: undefined,
      barPadding: 3,
      straightEdges: false,
    };
  },

  computed: {
    properties() {
      const {
        graphStructure,
        nodeFontSize,
        isDirected,
        isMultiEdge,
        attributes,
        renderNested,
        labelVariable,
        colorVariable,
        barVariables,
        glyphVariables,
        widthVariables,
        colorVariables,
        linkWidthScale,
      } = this;
      return {
        graphStructure,
        nodeFontSize,
        isDirected,
        isMultiEdge,
        attributes,
        renderNested,
        labelVariable,
        colorVariable,
        barVariables,
        glyphVariables,
        widthVariables,
        colorVariables,
        linkWidthScale,
      };
    },
  },

  watch: {
    properties() {
      this.updateVis(this.provenance);
    },
  },

  async mounted() {
    this.loadVis();

    this.simulation = this.makeSimulation(this.provenance.current().getState());

    // Required to update when brushing the legend
    this.$root.$on('brushing', () => {
      this.updateVis(this.provenance);
    });
  },

  methods: {
    ...updateVisMethods,

    loadVis() {
      // Get the browser width and height
      this.browser.width = window.innerWidth
      || document.documentElement.clientWidth
      || document.body.clientWidth;

      this.browser.height = window.innerHeight
      || document.documentElement.clientHeight
      || document.body.clientHeight;

      // Set dimensions of the nodelink
      this.visDimensions.width = this.browser.width * 0.75;
      this.visDimensions.height = this.browser.height - 24;

      // Apply the size to the nodelink svg
      this.svg = select(this.$refs.svg)
        .attr('width', this.visDimensions.width)
        .attr('height', this.visDimensions.height);

      // Set up groups for nodes/links
      this.svg.append('g').attr('class', 'links');
      this.svg.append('g').attr('class', 'nodes');

      // Call update vis to append all the data to the svg
      this.updateVis(this.provenance);
    },
  },
};
</script>

<template>
  <div>
    <svg
      ref="svg"
      width="800"
      height="900"
    />
    <div class="tooltip" />
  </div>
</template>

<style scoped>
@import './NodeLink.css';

.tooltip {
  position: absolute;
  opacity: 0;
  background-color: white;

  font-size:12.5px;
  color:#000;
  border-radius:5px;
  padding:5px;
  pointer-events:none;
  -webkit-box-shadow:0 4px 8px 0 rgba(0,0,0,.2);
  box-shadow:0 4px 8px 0 rgba(0,0,0,.2);
  max-width:400px
}
</style>
