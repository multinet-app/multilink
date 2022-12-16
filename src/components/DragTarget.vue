<script setup lang="ts">
import { useStore } from '@/store/index';
import { storeToRefs } from 'pinia';

const store = useStore();
const {
  edgeVariables,
  nestedVariables,
  nodeSizeVariable,
  nodeColorVariable,
} = storeToRefs(store);

const props = withDefaults(defineProps<{
  title: string
  type: 'node' | 'edge',
  showTitle?: boolean
}>(), {
  showTitle: true,
});

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
    store.setNestedVariables(updatedNestedVars);
  } else if (props.type === 'node' && props.title === 'glyphs') {
    const updatedNestedVars = {
      bar: nestedVariables.value.bar,
      glyph: [...nestedVariables.value.glyph, droppedVarName],
    };
    store.setNestedVariables(updatedNestedVars);
  } else if (props.type === 'node' && props.title === 'size') {
    nodeSizeVariable.value = droppedVarName;
  } else if (props.type === 'node' && props.title === 'color') {
    nodeColorVariable.value = droppedVarName;
  } else if (props.type === 'node' && props.title === 'x variable') {
    store.applyVariableLayout({
      varName: droppedVarName, axis: 'x',
    });
  } else if (props.type === 'node' && props.title === 'y variable') {
    store.applyVariableLayout({
      varName: droppedVarName, axis: 'y',
    });
  } else if (props.type === 'edge' && props.title === 'width') {
    const updatedEdgeVars = {
      width: droppedVarName,
      color: edgeVariables.value.color,
    };
    edgeVariables.value = updatedEdgeVars;
  } else if (props.type === 'edge' && props.title === 'color') {
    const updatedEdgeVars = {
      width: edgeVariables.value.width,
      color: droppedVarName,
    };
    edgeVariables.value = updatedEdgeVars;
  }
}
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
