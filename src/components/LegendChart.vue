<script setup lang="ts">
import {
  onMounted, onRenderTracked, ref, watch,
} from 'vue';
import { useStore } from '@/store';
import vegaEmbed from 'vega-embed';

// Required for recursive definition of LegendChart
// eslint-disable-next-line import/no-self-import
import LegendChart from '@/components/LegendChart.vue';
import { storeToRefs } from 'pinia';
import { useElementBounding } from '@vueuse/core';
import { TopLevelSpec } from 'vega-lite';

const store = useStore();
const {
  network,
  columnTypes,
  nestedVariables,
  nodeBarColorScale,
  nodeGlyphColorScale,
  attributeRanges,
  nodeSizeVariable,
  nodeColorVariable,
  edgeVariables,
  nodeSizeScale,
  nodeColorScale,
  edgeWidthScale,
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

const yAxisPadding = 30;
const svgHeight = props.mappedTo === 'bars' ? 75 : 50;

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

const variableSvgRef = ref<HTMLElement | null>(null);
const boundingBox = useElementBounding(variableSvgRef);

function render() {
  // If we have no svg to render to, exit
  if (variableSvgRef.value === null) {
    return;
  }

  let spec: TopLevelSpec | undefined;

  // node size
  if (props.mappedTo === 'size' && nodeSizeScale.value !== null) { // node size
    // Do something for the chart when mapped to node size
  // edge width
  } else if (props.mappedTo === 'width') {
    // Do something for the chart when mapped to edge width
  // node color and edge color
  } else if (props.mappedTo === 'color') {
    // Do something for the chart when mapped to node/edge color
  // glyphs
  } else if (props.mappedTo === 'glyphs') {
    // Do something for the chart when mapped to glyphs
  // nested bars
  } else if (props.mappedTo === 'bars') {
    // Do something for the chart when mapped to nested bars
  // numeric legend charts
  } else if (isQuantitative(props.varName, props.type)) {
    spec = {
      data: {
        values: network.value[`${props.type}s`].map((row) => ({
          ...row,
          [props.varName]: parseFloat(row[props.varName]),
        })),
      },
      mark: 'bar',
      encoding: {
        x: { bin: true, field: props.varName },
        y: { aggregate: 'count' },
      },
    };
  // categorical legend charts
  } else {
    // Do something for the chart when mapped to categorical legend charts
    spec = {
      data: {
        values: network.value[`${props.type}s`],
      },
      mark: 'bar',
      encoding: {
        x: { field: props.varName },
        y: { aggregate: 'count' },
      },
    };
  }

  if (spec === undefined) {
    return;
  }

  spec = {
    ...spec,
    width: boundingBox.width.value,
    height: 80,
    autosize: {
      type: 'fit-x',
      contains: 'padding',
    },
  };

  vegaEmbed(
    variableSvgRef.value,
    spec,
    { actions: false },
  );
}

watch(boundingBox.width, () => {
  render();
});
</script>

<template>
  <div
    class="pa-4 pb-0 black--text"
  >
    <div
      v-if="brushable"
    >
      <v-row class="px-4">
        <strong>Filter Values</strong>
        <v-spacer />
        <v-icon small>
          mdi-information
        </v-icon>
      </v-row>
    </div>

    <div
      v-else-if="selected && mappedTo !== 'bars'"
    >
      <div>
        <v-row style="margin-right: 0; margin-left: 0;">
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

          <v-spacer />

          <v-menu
            absolute
            :position-x="256"
            eager
          >
            <template #activator="{ on, attrs }">
              <v-btn
                x-small
                depressed
                text
                tile
                max-width="20"
                class="pa-0 pl-1"
                v-bind="attrs"
                v-on="on"
              >
                <v-icon
                  :size="24"
                  class="icon pt-0"
                  color="primary"
                  dark
                >
                  mdi-chart-box
                </v-icon>
              </v-btn>
            </template>
            <v-card :width="300">
              <legend-chart
                :var-name="varName"
                :selected="false"
                :brushable="true"
                :filter="mappedTo"
                :type="type"
                class="pb-4"
              />
            </v-card>
          </v-menu>
        </v-row>
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

    <div v-if="mappedTo === 'bars'">
      <v-icon
        v-for="(barVar, index) of nestedVariables.bar"
        :key="barVar"
        x-small
        :style="`position: absolute; left: ${50 * (index) + 63}px; top: 110px;`"
        @click="unAssignVar(barVar)"
      >
        mdi-close
      </v-icon>
    </div>
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
