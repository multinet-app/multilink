<script lang="ts">
import store from '@/store';
import { computed } from '@vue/composition-api';
import Vue, { PropType } from 'vue';

export default Vue.extend({
  props: {
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String as PropType<'node' | 'link'>,
      required: true,
    },
  },

  setup(props) {
    const linkVariables = computed(() => store.state.linkVariables);
    const nestedVariables = computed(() => store.state.nestedVariables);

    function elementDrop(event: DragEvent) {
      if (event.dataTransfer === null) {
        return;
      }

      const droppedVarName = event.dataTransfer.getData('attr_id').substring(5);

      if (props.type === 'node' && props.title === 'bars') {
        const updatedNestedVars = {
          bar: [...nestedVariables.value.bar, droppedVarName],
          glyph: nestedVariables.value.glyph,
        };
        store.commit.setNestedVariables(updatedNestedVars);
      } else if (props.type === 'node' && props.title === 'glyphs') {
        const updatedNestedVars = {
          bar: nestedVariables.value.bar,
          glyph: [...nestedVariables.value.glyph, droppedVarName],
        };
        store.commit.setNestedVariables(updatedNestedVars);
      } else if (props.type === 'node' && props.title === 'size') {
        store.commit.setNodeSizeVariable(droppedVarName);
      } else if (props.type === 'node' && props.title === 'color') {
        store.commit.setNodeColorVariable(droppedVarName);
      } else if (props.type === 'link' && props.title === 'width') {
        const updatedLinkVars = {
          width: droppedVarName,
          color: linkVariables.value.color,
        };
        store.commit.setLinkVariables(updatedLinkVars);
      } else if (props.type === 'link' && props.title === 'color') {
        const updatedLinkVars = {
          width: linkVariables.value.width,
          color: droppedVarName,
        };
        store.commit.setLinkVariables(updatedLinkVars);
      }
    }

    return {
      elementDrop,
    };
  },
});
</script>

<template>
  <div class="pa-4 white-background">
    {{ title }}

    <div
      class="drag-target"
      @drop="elementDrop"
      @dragenter.prevent
      @dragover.prevent
    >
      <p>
        <v-icon
          small
          dark
          color="grey"
        >
          mdi-chart-bar
        </v-icon> drag attribute
      </p>
    </div>
  </div>
</template>

<style scoped>
.white-background {
  background-color: white;
}

.drag-target {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: auto;
  height: 50px;
  border: dashed;
  border-width: 2px;
  border-radius: 5px;
  border-color: grey;
  padding: auto;
}

p {
  margin: auto;
  color: grey;
}
</style>
