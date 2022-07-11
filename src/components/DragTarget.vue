<script lang="ts">
import store from '@/store';
import { computed, defineComponent, PropType } from 'vue';

export default defineComponent({
  props: {
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String as PropType<'node' | 'edge'>,
      required: true,
    },
    showTitle: {
      type: Boolean,
      default: true,
    },
  },

  setup(props) {
    const edgeVariables = computed(() => store.state.edgeVariables);
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
      } else if (props.type === 'node' && props.title === 'x variable') {
        store.dispatch.applyVariableLayout({
          varName: droppedVarName, axis: 'x',
        });
      } else if (props.type === 'node' && props.title === 'y variable') {
        store.dispatch.applyVariableLayout({
          varName: droppedVarName, axis: 'y',
        });
      } else if (props.type === 'edge' && props.title === 'width') {
        const updatedEdgeVars = {
          width: droppedVarName,
          color: edgeVariables.value.color,
        };
        store.commit.setEdgeVariables(updatedEdgeVars);
      } else if (props.type === 'edge' && props.title === 'color') {
        const updatedEdgeVars = {
          width: edgeVariables.value.width,
          color: droppedVarName,
        };
        store.commit.setEdgeVariables(updatedEdgeVars);
      }
    }

    return {
      elementDrop,
    };
  },
});
</script>

<template>
  <div class="pa-4">
    <div v-if="showTitle">
      {{ title }}
    </div>

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
