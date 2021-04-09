<script lang="ts">
import store from '@/store';
import { Node, Link } from '@/types';
import {
  computed, defineComponent, onMounted, PropType,
} from '@vue/composition-api';
import { histogram, max, min } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

export default defineComponent({
  props: {
    varName: {
      type: String,
      required: true,
    },
    type: {
      type: String as PropType<'node' | 'link'>,
      required: true,
    },
    selected: {
      type: Boolean,
      required: true,
    },
    mappedTo: {
      type: String,
      default: '',
    },
  },

  setup(props) {
    const yAxisPadding = 30;
    const svgHeight = 50;

    const network = computed(() => store.getters.network);
    const columnTypes = computed(() => store.getters.columnTypes);
    const nodeGlyphColorScale = computed(() => store.getters.nodeGlyphColorScale);

    // TODO: https://github.com/multinet-app/multilink/issues/176
    // use table name for var selection
    function isQuantitative(varName: string, type: 'node' | 'link') {
      if (Object.keys(columnTypes.value).length > 0) {
        return columnTypes.value[varName] === 'number';
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let nodesOrLinks: any[];

      if (network.value !== null) {
        nodesOrLinks = type === 'node' ? network.value.nodes : network.value.edges;
        const uniqueValues = [...new Set(nodesOrLinks.map((element) => parseFloat(element[varName])))];
        return uniqueValues.length > 5;
      }
      return false;
    }

    function dragStart(event: DragEvent) {
      if (event.dataTransfer !== null && event.target !== null) {
        event.dataTransfer.setData('attr_id', (event.target as Element).id);
      }
    }

    function unAssignVar() {
      if (props.type === 'node') {
        if (props.mappedTo === 'size') {
          store.commit.setNodeSizeVariable('');
        } else if (props.mappedTo === 'color') {
          store.commit.setNodeColorVariable('');
        }
      } else if (props.type === 'link') {
        if (props.mappedTo === 'width') {
          store.commit.setLinkVariables({
            width: '',
            color: store.getters.linkVariables.color,
          });
        } else if (props.mappedTo === 'color') {
          store.commit.setLinkVariables({
            width: store.getters.linkVariables.width,
            color: '',
          });
        }
      }
    }

    onMounted(() => {
      const variableSvg = select(`#${props.type}${props.varName}${props.mappedTo}`);

      const variableSvgWidth = (variableSvg
        .node() as Element)
        .getBoundingClientRect()
        .width - yAxisPadding;

      if (network.value === null) {
        return;
      }

      // Process data for bars/histogram
      if (isQuantitative(props.varName, props.type)) {
        let currentData: number[] = [];
        if (props.type === 'node') {
          currentData = network.value.nodes.map((d: Node | Link) => parseFloat(d[props.varName]));
        } else {
          currentData = network.value.edges.map((d: Node | Link) => parseFloat(d[props.varName]));
        }

        const xScale = scaleLinear()
          .domain([Math.min(...currentData), Math.max(...currentData) + 1])
          .range([yAxisPadding, variableSvgWidth]);

        const binGenerator = histogram()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .domain((xScale as any).domain()) // then the domain of the graphic
          .thresholds(xScale.ticks(15)); // then the numbers of bins

        const bins = binGenerator(currentData);

        store.commit.addAttributeRange({
          attr: props.varName,
          min: xScale.domain()[0] || 0,
          max: xScale.domain()[1] || 0,
          binLabels: xScale.domain().map((label) => label.toString()),
          binValues: xScale.range(),
        });

        const yScale = scaleLinear()
          .domain([0, max(bins, (d) => d.length) || 0])
          .range([svgHeight, 10]);

        variableSvg
          .selectAll('rect')
          .data(bins)
          .enter()
          .append('rect')
          .attr('x', (d) => xScale(d.x0 || 0))
          .attr('y', (d) => yScale(d.length))
          .attr('height', (d) => svgHeight - yScale(d.length))
          .attr('width', (d) => xScale(d.x1 || 0) - xScale(d.x0 || 0))
          .attr('fill', '#82B1FF');

        // Add the axis scales onto the chart
        variableSvg
          .append('g')
          .attr('transform', `translate(${yAxisPadding},0)`)
          .call(axisLeft(yScale).ticks(4, 's'));

        variableSvg
          .append('g')
          .attr('transform', `translate(0, ${svgHeight})`)
          .call(axisBottom(xScale).ticks(4, 's'));
      } else {
        let currentData: string[] = [];
        if (props.type === 'node') {
          currentData = network.value.nodes.map((d: Node | Link) => d[props.varName]).sort();
        } else {
          currentData = network.value.edges.map((d: Node | Link) => d[props.varName]).sort();
        }

        const bins = new Map([...new Set(currentData)].map(
          (x) => [x, currentData.filter((y) => y === x).length],
        ));

        const binLabels: string[] = Array.from(bins.keys());
        const binValues: number[] = Array.from(bins.values());

        store.commit.addAttributeRange({
          attr: props.varName,
          min: parseFloat(min(binLabels) || '0'),
          max: parseFloat(max(binLabels) || '0'),
          binLabels,
          binValues,
        });

        // Generate axis scales
        const yScale = scaleLinear()
          .domain([min(binValues) || 0, max(binValues) || 0])
          .range([svgHeight, 0]);

        const xScale = scaleBand()
          .domain(binLabels)
          .range([yAxisPadding, variableSvgWidth]);

        variableSvg
          .selectAll('rect')
          .data(currentData)
          .enter()
          .append('rect')
          .attr('x', (d: string) => xScale(d) || 0)
          .attr('y', (d: string) => yScale(bins.get(d) || 0))
          .attr('height', (d: string) => svgHeight - yScale(bins.get(d) || 0))
          .attr('width', xScale.bandwidth())
          .attr('fill', (d: string) => nodeGlyphColorScale.value(d));

        // Add the axis scales onto the chart
        variableSvg
          .append('g')
          .attr('transform', `translate(${yAxisPadding},0)`)
          .call(axisLeft(yScale).ticks(4, 's'));

        variableSvg
          .append('g')
          .attr('transform', `translate(0, ${svgHeight})`)
          .call(axisBottom(xScale).ticks(4, 's'));
      }
    });

    return {
      svgHeight,
      dragStart,
      unAssignVar,
    };
  },
});
</script>

<template>
  <div
    class="pa-4 pb-0"
  >
    <div
      v-if="selected"
      class="sticky-legend-chart"
    >
      <div>
        <v-row style="margin-right: 0; margin-left: 0;">
          {{ mappedTo }}:
          <v-spacer />
          <strong class="pr-2">{{ varName }}</strong>
          <v-icon
            small
            class="icon"
            @click="unAssignVar"
          >
            mdi-close
          </v-icon>
        </v-row>
      </div>

      <svg
        :id="`${type}${varName}${mappedTo}`"
        :height="svgHeight + 20"
        width="100%"
      />
    </div>

    <div
      v-else
      class="legend-chart"
    >
      <div
        :id="`drag-${varName}`"
        class="px-2 grey lighten-3"
        draggable
        @dragstart="dragStart"
      >
        {{ varName }}
        <v-icon class="icon">
          mdi-drag
        </v-icon>
      </div>

      <svg
        :id="`${type}${varName}${mappedTo}`"
        :height="svgHeight + 20"
        width="100%"
      />
    </div>
  </div>
</template>

<style scoped>
.legend-chart {
  border: 1px solid #BDBDBD;
  box-shadow: 0px 1px 6px rgba(0, 0, 0, 0.1);
}

.icon {
  margin-right: 0;
  float: right;
}
</style>
