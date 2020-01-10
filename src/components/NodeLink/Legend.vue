<script>
import * as d3 from "d3";

export default {
  props: {
    /**
     * props define properties that should be controlled by
     * the users or will need to be modified externally.
     */
    
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

  methods: {
    // define many functions externally
    // ...loadVisMethods,
    // ...updateVisMethods,
    // ...uiMethods,
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
