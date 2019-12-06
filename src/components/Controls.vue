<script>
/**
 * Demo Controls.  This component is meant to demo
 * the capabilities of the NodeLink vis.
 *
 * You'll probably want the controls to look or
 * work differently in your app, so it's recommended that you
 * implement the controls yourself.
 */
export default {
  props: {
    nodeMarkerSize: {
      type: Number,
      default: 50
    },

    nodeFontSize: {
      type: Number,
      default: 14,
    },
  }
};
</script>

<template>
  <v-card>
    <v-card-title class="pb-6">MultiNet Node Link Controls</v-card-title>

    <v-card-text>
      <v-card-subtitle class="pb-0">Marker Size</v-card-subtitle>
      <v-slider
        :value="nodeMarkerSize"
        @input="$emit('update:nodeMarkerSize', $event)"
        :max="100"
        :min="10"
        hide-details
      />
      <p>{{ nodeMarkerSize }}</p>
    </v-card-text>

    <v-card-text>
      <v-card-subtitle class="pb-0">Font Size</v-card-subtitle>
      <v-slider
        :value="nodeFontSize"
        @input="$emit('update:nodeFontSize', $event)"
        :min="10"
        :max="30"
        hide-details
      />
      <p>{{ nodeFontSize }}</p>
    </v-card-text>

    <v-card-actions>
      <v-btn small @click="$emit('restart-simulation')">Restart Simulation</v-btn>
    </v-card-actions>
  </v-card>
</template>
