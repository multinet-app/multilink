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

</style>
