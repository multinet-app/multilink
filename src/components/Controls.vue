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
    nodeMarkerLength: {
      type: Number,
      default: 50
    },
    nodeMarkerHeight: {
      type: Number,
      default: 50
    }
  }
};
</script>

<template>
  <v-card>
    <v-card-title class="pb-6">MultiNet Node Link Controls</v-card-title>

    <v-card-text>
      <v-card-subtitle class="pb-0">Marker Height</v-card-subtitle>
      <v-slider
        :value="nodeMarkerHeight"
        @input="$emit('update:nodeMarkerHeight', $event)"
        :max="100"
        :min="10"
        hide-details
      />
      <v-card-subtitle class="pb-0">Marker Length</v-card-subtitle>
      <v-slider
        :value="nodeMarkerLength"
        @input="$emit('update:nodeMarkerLength', $event)"
        :max="100"
        :min="10"
        hide-details
      />
    </v-card-text>
    <v-card-actions>
      <v-btn small @click="$emit('restart-simulation')">Restart Simulation</v-btn>
    </v-card-actions>
  </v-card>
</template>
