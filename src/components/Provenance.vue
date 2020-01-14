<script>

export default {
  data: () => ({
      fav: true,
      menu: false,
      message: false,
      hints: true,
    }),

  computed: {
    properties() {
      const menu = false;
      return menu
    }
  },
};
</script>

<template>
  <div>
    <v-menu class="ma-0 pa-0"
      v-model="menu"
      :close-on-content-click="false"
      :nudge-width="200"
      offset-y
    >
      <template v-slot:activator="{ on }">
        <v-btn
          color="primary"
          dark
          v-on="on"
        >
          Provenance Visual
        </v-btn>
      </template>

      <v-card>
        <svg ref="svg" width="250" height="250"/>
        <v-card-actions>
          <v-btn text @click="menu = false">Undo</v-btn>
          <v-btn text @click="menu = false">Redo</v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
  </div>
</template>

<style scoped>
  div {
    margin-top: 10px
  }
</style>