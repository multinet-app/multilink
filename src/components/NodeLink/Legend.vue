<script>
import * as d3 from "d3";

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
    /**
     * data defines internal state that no external sources
     * should modify.
     */
    return {
    };
  },

  computed: {
    properties() {
      const {
      } = this;
      return {
      };
    }
  },

  watch: {
    properties() {
      this.updateLegend();
    }
  },

  async mounted() {
    /**
     * mounted hook runs after the component is injected into the DOM
     */
    
  },
};
</script>

<template>
  <div>
    <v-card>
      <v-card-title>Legend</v-card-title>
      <svg id="legend" class="col-12" ref="svg" height="200" style="background-color: black;"/>
    </v-card>
  </div>
</template>

<style scoped>
.v-card {
    /* max-height: calc(100vh - 24px - 12px - 400px); */
    max-height: calc(25vh - 24px);
    overflow-y: scroll
  }
</style>
