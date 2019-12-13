<script>
/**
 * Demo app for NodeLink component.  To use this library,
 * you'll want to implement this "state container" component
 * yourself and wire it up to your control board on your own.
 */
import Controls from "./components/Controls.vue";

export default {
  name: "app",

  components: {
    Controls
  },
};
</script>

<template>
  <v-app>
    <v-content>
      <controls />
    </v-content>
  </v-app>
</template>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.node-link-controls {
  width: 300px;
}
</style>
