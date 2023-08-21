<script setup lang="ts">
import {
  computed, onMounted, ref, watch,
} from 'vue';
import { useStore } from '@/store';
import vegaEmbed, { VisualizationSpec } from 'vega-embed';

// Required for recursive definition of LegendChart
// eslint-disable-next-line import/no-self-import
import { storeToRefs } from 'pinia';
import { useElementBounding } from '@vueuse/core';
import { ScaleOrdinal } from 'd3';

const store = useStore();
const {
  network,
  columnTypes,
  nestedVariables,
  nodeSizeVariable,
  nodeColorVariable,
  edgeVariables,
  nodeColorScale,
  edgeColorScale,
} = storeToRefs(store);

const props = withDefaults(defineProps<{
  varName: string
  type: 'node' | 'edge',
  selected: boolean,
  brushable?: boolean,
  mappedTo?: string,
  filter?: string,
}>(), {
  brushable: false,
  mappedTo: '',
  filter: '',
});

// TODO: https://github.com/multinet-app/multilink/issues/176
// use table name for var selection
function isQuantitative(varName: string, type: 'node' | 'edge') {
  if (columnTypes.value !== null && Object.keys(columnTypes.value).length > 0) {
    return columnTypes.value[varName] === 'number';
  }

  const nodesOrEdges = type === 'node' ? network.value.nodes : network.value.edges;
  const uniqueValues = [...new Set(nodesOrEdges.map((element) => parseFloat(element[varName])))];
  return uniqueValues.length > 5;
}

function dragStart(event: DragEvent) {
  if (event.dataTransfer !== null && event.target !== null) {
    event.dataTransfer.setData('attr_id', (event.target as Element).id);
  }
}

function unAssignVar(variable?: string) {
  if (props.type === 'node') {
    if (props.mappedTo === 'size') {
      nodeSizeVariable.value = '';
    } else if (props.mappedTo === 'color') {
      nodeColorVariable.value = '';
    } else if (props.mappedTo === 'bars') {
      const newBarVars = nestedVariables.value.bar.filter(
        (barVar) => barVar !== variable,
      );

      store.setNestedVariables({
        bar: newBarVars,
        glyph: nestedVariables.value.glyph,
      });
    } else if (props.mappedTo === 'glyphs') {
      const newGlyphVars = nestedVariables.value.glyph.filter(
        (glyphVar) => glyphVar !== props.varName,
      );

      store.setNestedVariables({
        bar: nestedVariables.value.bar,
        glyph: newGlyphVars,
      });
    } else if (props.mappedTo === 'x' || props.mappedTo === 'y') {
      store.applyVariableLayout({
        varName: null, axis: props.mappedTo,
      });
    }
  } else if (props.type === 'edge') {
    if (props.mappedTo === 'width') {
      edgeVariables.value = {
        width: '',
        color: store.edgeVariables.color,
      };
    } else if (props.mappedTo === 'color') {
      edgeVariables.value = {
        width: store.edgeVariables.width,
        color: '',
      };
    }
  }
}

const barData = computed(() => nestedVariables.value.bar.map((barVar, index) => ({
  group: barVar,
  value: 50,
  index,
})));

const variableSvgRef = ref<HTMLElement | null>(null);
const boundingBox = useElementBounding(variableSvgRef);

function render() {
  // If we have no svg to render to, exit
  if (variableSvgRef.value === null) {
    return;
  }

  let spec: VisualizationSpec | undefined;

  // node size
  if (props.mappedTo === 'size') {
    const intermediateData = [...new Set(network.value[`${props.type}s`].map((row) => parseFloat(row[props.varName])))];
    const min = Math.min(...intermediateData);
    const max = Math.max(...intermediateData);
    const mid = (min + max) / 2;
    const data = [min, mid, max].map((x, idx) => ({ index: idx, [props.varName]: x }));
    spec = {
      data: {
        values: data,
      },
      mark: {
        type: 'circle',
        size: { expr: '(datum.index + .1) * 300' },
      },
      encoding: {
        x: { field: props.varName, axis: { format: '.2~s' } },
      },
    };
  // edge width
  } else if (props.mappedTo === 'width') {
    const intermediateData = [...new Set(network.value[`${props.type}s`].map((row) => parseFloat(row[props.varName])))];
    const min = Math.min(...intermediateData);
    const max = Math.max(...intermediateData);
    const mid = (min + max) / 2;
    const data = [min, mid, max].map((x, idx) => ({ index: idx, [props.varName]: x }));
    spec = {
      data: {
        values: data,
      },
      mark: {
        type: 'bar',
        width: { expr: '(datum.index + .1) * 8' },
        height: 20,
        orient: 'horizontal',
      },
      encoding: {
        x: { field: props.varName, axis: { format: '.2~s' } },
      },
    };
  // node color and edge color and glyphs
  } else if (props.mappedTo === 'color' || props.mappedTo === 'glyphs') {
    if (columnTypes.value[props.varName] === 'number') {
      const intermediateData = [...new Set(network.value[`${props.type}s`].map((row) => parseFloat(row[props.varName])))];
      const min = Math.min(...intermediateData);
      const max = Math.max(...intermediateData);
      const data = [min, max].map((x, idx) => ({ index: idx, [props.varName]: x }));
      const scaleToUse = props.type === 'node' ? nodeColorScale.value : edgeColorScale.value;
      const valueForMidScale = (scaleToUse.domain()[0] + scaleToUse.domain()[1]) / 2;
      spec = {
        data: {
          values: data,
        },
        mark: 'rect',
        encoding: {
          x: {
            field: props.varName,
            aggregate: 'min',
            axis: { tickCount: 4 },
            scale: { domain: [min, max] },
          },
          x2: { field: props.varName, aggregate: 'max' },
          y: { value: 5 },
          y2: { value: 40 },
          fill: {
            value: {
              gradient: 'linear',
              stops: [
                { offset: 0.0, color: scaleToUse(scaleToUse.domain()[0]) },
                { offset: 0.5, color: scaleToUse(valueForMidScale) },
                { offset: 1.0, color: scaleToUse(scaleToUse.domain()[1]) },
              ],
            },
          },
        },
      };
    } else {
      const data = [...new Set(network.value[`${props.type}s`].map((row) => row[props.varName]))].map((x) => ({ [props.varName]: x }));
      spec = {
        data: {
          values: data,
        },
        mark: 'square',
        encoding: {
          x: { field: props.varName },
          size: { value: 300 },
          color: {
            field: props.varName,
            scale: {
              domain: nodeColorScale.value.domain(),
              range: (nodeColorScale.value as ScaleOrdinal<string, string, never>).range(),
            },
            legend: null,
          },
        },
      };
    }
  // nested bars
  } else if (props.mappedTo === 'bars') {
    // Make sure the bars colors are ready in the color scale
    barData.value.forEach((bar) => {
      nodeColorScale.value(bar.group);
    });

    spec = {
      data: {
        values: barData.value,
      },
      mark: 'bar',
      encoding: {
        x: { field: 'group', sort: { field: 'index' } },
        y: { field: 'value' },
        key: { field: 'group' },
        fill: {
          field: 'group',
          scale: {
            domain: nodeColorScale.value.domain(),
            range: (nodeColorScale.value as ScaleOrdinal<string, string, never>).range(),
          },
          legend: null,
        },
      },
      usermeta: { embedOptions: { renderer: 'svg' } },
    };
  // numeric legend charts
  } else if (isQuantitative(props.varName, props.type)) {
    // Find the right pieces of data
    const specData = network.value[`${props.type}s`].map((row) => ({
      ...row,
      [props.varName]: parseFloat(row[props.varName]),
    }));
    const attrRangeData: number[] = specData.map((row) => row[props.varName]);

    // If this is the first time seeing the variable, add its attribute range
    if (props.mappedTo === '') {
      store.addAttributeRange({
        attr: props.varName,
        min: Math.min(...attrRangeData),
        max: Math.max(...attrRangeData),
        binLabels: [],
      });
    }

    spec = {
      data: {
        values: specData,
      },
      mark: 'bar',
      encoding: {
        x: { bin: true, field: props.varName, axis: { format: '.2~s' } },
        y: { aggregate: 'count', axis: { title: 'Count' } },
      },
    };
  // categorical legend charts
  } else {
    // Find the right pieces of data
    const specData = network.value[`${props.type}s`];
    const attrRangeData: string[] = specData.map((row) => row[props.varName]);

    // If this is the first time seeing the variable, add its attribute range
    if (props.mappedTo === '') {
      store.addAttributeRange({
        attr: props.varName,
        min: 0,
        max: 0,
        binLabels: attrRangeData,
      });
    }

    spec = {
      data: {
        values: specData,
      },
      mark: 'bar',
      encoding: {
        x: { field: props.varName },
        y: { aggregate: 'count', axis: { title: 'Count' } },
      },
    };
  }

  // add some default values
  spec = {
    ...spec,
    width: boundingBox.width.value,
    height: 50,
    autosize: {
      type: 'fit-x',
      contains: 'padding',
    },
    config: {
      axis: {
        grid: false,
        domain: false,
        ticks: false,
        title: null,
      },
      view: {
        stroke: null,
      },
    },
  };

  if (spec === undefined) {
    return;
  }

  vegaEmbed(
    variableSvgRef.value,
    spec,
    { actions: false },
  ).then(({ view }) => {
    // If this is the bar chart, add a click listener to unassign variables on click
    if (props.mappedTo === 'bars') {
      // eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-explicit-any
      view.addEventListener('click', (event) => unAssignVar((event.target as any).__data__?.datum?.group));
    }
  });
}

watch([boundingBox.width, barData], () => {
  render();
});
onMounted(render);
</script>

<template>
  <div
    class="pa-4 pb-0 black--text"
  >
    <div
      v-if="selected && mappedTo !== 'bars'"
    >
      <div>
        {{ mappedTo }}:
        <strong
          class="pl-1 label"
          :title="varName"
        >{{ varName }}</strong>
        <v-icon
          small
          class="icon pt-0"
          :height="20"
          @click="unAssignVar"
        >
          mdi-close-circle
        </v-icon>
      </div>
    </div>

    <div v-else-if="mappedTo === 'bars'">
      {{ mappedTo }}:
    </div>

    <div
      v-else
      class="legend-chart"
    >
      <div
        :id="`drag-${varName}`"
        class="pl-2 grey lighten-3"
        draggable
        @dragstart="dragStart"
      >
        {{ varName }}
        <v-icon
          small
          class="icon"
          style="top: -2px"
        >
          mdi-drag-vertical
        </v-icon>
      </div>
    </div>

    <div ref="variableSvgRef" style="width: 100%;" />
  </div>
</template>

<style scoped>
.legend-chart {
  border: 1px solid #BDBDBD;
  box-shadow: 0px 1px 6px rgba(0, 0, 0, 0.1);
}

.icon {
  height: 20px;
  padding-top: 6px;
  padding-right: 4px;
  margin-right: 0;
  float: right;
}

.label {
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
