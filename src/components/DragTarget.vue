<script setup lang="ts">
import { useStore } from '@/store';
import { storeToRefs } from 'pinia';

const store = useStore();
const {
  edgeVariables,
  nestedVariables,
  nodeSizeVariable,
  nodeColorVariable,
  columnTypes,
  snackBarMessage,
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
    if (columnTypes.value[droppedVarName] !== 'number') {
      snackBarMessage.value = 'You must use a numeric variable for bars';
      return;
    }

    const updatedNestedVars = {
      bar: [...nestedVariables.value.bar, droppedVarName],
      glyph: nestedVariables.value.glyph,
    };
    store.setNestedVariables(updatedNestedVars);
  } else if (props.type === 'node' && props.title === 'glyphs') {
    if (!['category', 'boolean'].includes(columnTypes.value[droppedVarName])) {
      snackBarMessage.value = 'You must use a categorical or boolean variable for glyphs';
      return;
    }

    const updatedNestedVars = {
      bar: nestedVariables.value.bar,
      glyph: [...nestedVariables.value.glyph, droppedVarName],
    };
    store.setNestedVariables(updatedNestedVars);
  } else if (props.type === 'node' && props.title === 'size') {
    if (columnTypes.value[droppedVarName] !== 'number') {
      snackBarMessage.value = 'You must use a numeric variable for size';
      return;
    }

    nodeSizeVariable.value = droppedVarName;
  } else if (props.type === 'node' && props.title === 'color') {
    if (!['number', 'category', 'boolean'].includes(columnTypes.value[droppedVarName])) {
      snackBarMessage.value = 'You must use a numeric, categorical, or boolean variable for color';
      return;
    }

    nodeColorVariable.value = droppedVarName;
  } else if (props.type === 'node' && props.title === 'x variable') {
    if (!['number', 'category', 'boolean'].includes(columnTypes.value[droppedVarName])) {
      snackBarMessage.value = 'You must use a numeric, categorical, or boolean variable for x variable';
      return;
    }

    store.applyVariableLayout({
      varName: droppedVarName, axis: 'x',
    });
  } else if (props.type === 'node' && props.title === 'y variable') {
    if (!['number', 'category', 'boolean'].includes(columnTypes.value[droppedVarName])) {
      snackBarMessage.value = 'You must use a numeric, categorical, or boolean variable for y variable';
      return;
    }

    store.applyVariableLayout({
      varName: droppedVarName, axis: 'y',
    });
  } else if (props.type === 'edge' && props.title === 'width') {
    if (columnTypes.value[droppedVarName] !== 'number') {
      snackBarMessage.value = 'You must use a numeric variable for width';
      return;
    }

    const updatedEdgeVars = {
      width: droppedVarName,
      color: edgeVariables.value.color,
    };
    edgeVariables.value = updatedEdgeVars;
  } else if (props.type === 'edge' && props.title === 'color') {
    if (!['number', 'category', 'boolean'].includes(columnTypes.value[droppedVarName])) {
      snackBarMessage.value = 'You must use a numeric, categorical, or boolean variable for color';
      return;
    }

    const updatedEdgeVars = {
      width: edgeVariables.value.width,
      color: droppedVarName,
    };
    edgeVariables.value = updatedEdgeVars;
  }
}
</script>

<template>
  <div class="px-4 pb-4 pt-2">
    <div v-if="showTitle" class="black--text">
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
