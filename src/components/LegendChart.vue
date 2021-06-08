<script lang="ts">
import store from '@/store';
import { Node, Link } from '@/types';
import {
  computed, defineComponent, onMounted, PropType,
} from '@vue/composition-api';
import { histogram, max, min } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import { brushX, D3BrushEvent } from 'd3-brush';
import {
  ScaleBand, scaleBand, ScaleLinear, scaleLinear,
} from 'd3-scale';
import { select } from 'd3-selection';

export default defineComponent({
  name: 'LegendChart',

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
    brushable: {
      type: Boolean,
      default: false,
    },
    mappedTo: {
      type: String,
      default: '',
    },
  },

  setup(props) {
    const yAxisPadding = 30;
    const svgHeight = 50;

    const network = computed(() => store.state.network);
    const columnTypes = computed(() => store.state.columnTypes);
    const nodeSizeScale = computed(() => store.getters.nodeSizeScale);
    const nodeColorScale = computed(() => store.getters.nodeColorScale);
    const nodeGlyphColorScale = computed(() => store.state.nodeGlyphColorScale);
    const linkWidthScale = computed(() => store.state.linkWidthScale);
    const linkColorScale = computed(() => store.getters.linkColorScale);

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
            color: store.state.linkVariables.color,
          });
        } else if (props.mappedTo === 'color') {
          store.commit.setLinkVariables({
            width: store.state.linkVariables.width,
            color: '',
          });
        }
      }
    }

    onMounted(() => {
      const variableSvg = select(`#${props.type}${props.varName}${props.mappedTo}`);

      let variableSvgWidth = (variableSvg
        .node() as Element)
        .getBoundingClientRect()
        .width - yAxisPadding;

      variableSvgWidth = variableSvgWidth < 0 ? 256 : variableSvgWidth;

      let xScale: ScaleLinear<number, number> | ScaleBand<string>;
      let yScale: ScaleLinear<number, number>;

      if (network.value === null) {
        return;
      }

      // Process data for bars/histogram
      if (props.mappedTo === 'size' && nodeSizeScale.value !== null) { // node size
        xScale = scaleLinear()
          .domain(nodeSizeScale.value.domain())
          .range([yAxisPadding, variableSvgWidth]);

        // Draw circles
        variableSvg
          .append('circle')
          .attr('cx', yAxisPadding)
          .attr('cy', yAxisPadding + 15)
          .attr('r', 5)
          .attr('fill', '#3977AF');

        variableSvg
          .append('circle')
          .attr('cx', (variableSvgWidth + yAxisPadding) / 2)
          .attr('cy', yAxisPadding + 10)
          .attr('r', 10)
          .attr('fill', '#3977AF');

        variableSvg
          .append('circle')
          .attr('cx', variableSvgWidth)
          .attr('cy', yAxisPadding)
          .attr('r', 20)
          .attr('fill', '#3977AF');
      } else if (props.mappedTo === 'width') { // link width
        yScale = scaleLinear()
          .domain(linkWidthScale.value.domain())
          .range([svgHeight, 10]);

        const minValue = linkWidthScale.value.range()[0];
        const maxValue = linkWidthScale.value.range()[1];
        const middleValue = (linkWidthScale.value.range()[1] + linkWidthScale.value.range()[0]) / 2;

        // Draw width lines
        variableSvg
          .append('rect')
          .attr('height', maxValue)
          .attr('width', variableSvgWidth)
          .attr('x', yAxisPadding)
          .attr('y', 0)
          .attr('fill', '#888888');

        variableSvg
          .append('rect')
          .attr('height', middleValue)
          .attr('width', variableSvgWidth)
          .attr('x', yAxisPadding)
          .attr('y', svgHeight / 2)
          .attr('fill', '#888888');

        variableSvg
          .append('rect')
          .attr('height', minValue)
          .attr('width', variableSvgWidth)
          .attr('x', yAxisPadding)
          .attr('y', svgHeight)
          .attr('fill', '#888888');
      } else if (props.mappedTo === 'color') { // node color and link color
        if (isQuantitative(props.varName, props.type)) {
          // Gradient
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let scale: any;

          if (props.type === 'node') {
            xScale = scaleBand()
              .domain(nodeColorScale.value.domain() as string[])
              .range([yAxisPadding, variableSvgWidth]);

            scale = nodeColorScale.value;
          } else {
            xScale = scaleBand()
              .domain((linkColorScale.value).domain() as string[])
              .range([yAxisPadding, variableSvgWidth]);

            scale = linkColorScale.value;
          }

          const minColor = scale(scale.domain()[0]);
          const midColor = scale((scale.domain()[0] + scale.domain()[1]) / 2);
          const maxColor = scale(scale.domain()[1]);

          const gradient = variableSvg
            .append('defs')
            .append('linearGradient')
            .attr('id', 'grad');

          gradient
            .append('stop')
            .attr('offset', '0%')
            .attr('stop-color', minColor);

          gradient
            .append('stop')
            .attr('offset', '50%')
            .attr('stop-color', midColor);

          gradient
            .append('stop')
            .attr('offset', '100%')
            .attr('stop-color', maxColor);

          variableSvg
            .append('rect')
            .attr('height', 20)
            .attr('width', (xScale(scale.domain()[1]) || 0) - (xScale(scale.domain()[0]) || 0))
            .attr('x', yAxisPadding + (xScale(scale.domain()[0]) || 0) + 8)
            .attr('y', 20)
            .attr('fill', 'url(#grad)');
        } else {
          // Swatches
          const binLabels = [...new Set(network.value.nodes.map((d: Node | Link) => d[props.varName]))];

          xScale = scaleBand()
            .domain(binLabels)
            .range([yAxisPadding, variableSvgWidth]);

          // Draw swatches
          const swatchWidth = (variableSvgWidth - yAxisPadding) / binLabels.length;

          variableSvg
            .selectAll('rect')
            .data(binLabels)
            .enter()
            .append('rect')
            .attr('height', 15)
            .attr('width', swatchWidth)
            .attr('x', (d, i) => (swatchWidth * i) + yAxisPadding)
            .attr('y', 25)
            .attr('fill', (d) => nodeGlyphColorScale.value(d))
            .classed('swatch', true);
        }
      } else if (isQuantitative(props.varName, props.type)) { // main numeric legend charts
        let currentData: number[] = [];
        if (props.type === 'node') {
          currentData = network.value.nodes.map((d: Node | Link) => parseFloat(d[props.varName]));
        } else {
          currentData = network.value.edges.map((d: Node | Link) => parseFloat(d[props.varName]));
        }

        xScale = scaleLinear()
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

        yScale = scaleLinear()
          .domain([0, max(bins, (d) => d.length) || 0])
          .range([svgHeight, 10]);

        variableSvg
          .selectAll('rect')
          .data(bins)
          .enter()
          .append('rect')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .attr('x', (d) => xScale(d.x0 as any) || 0)
          .attr('y', (d) => yScale(d.length))
          .attr('height', (d) => svgHeight - yScale(d.length))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .attr('width', (d) => (xScale(d.x1 as any) || 0) - (xScale(d.x0 as any) || 0))
          .attr('fill', '#82B1FF');
      } else { // main categorical legend charts
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
        yScale = scaleLinear()
          .domain([min(binValues) || 0, max(binValues) || 0])
          .range([svgHeight, 0]);

        xScale = scaleBand()
          .domain(binLabels)
          .range([yAxisPadding, variableSvgWidth]);

        variableSvg
          .selectAll('rect')
          .data(currentData)
          .enter()
          .append('rect')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .attr('x', (d: string) => xScale(d as any) || 0)
          .attr('y', (d: string) => yScale(bins.get(d) || 0))
          .attr('height', (d: string) => svgHeight - yScale(bins.get(d) || 0))
          .attr('width', xScale.bandwidth())
          .attr('fill', (d: string) => nodeGlyphColorScale.value(d));
      }

      // Add the axis scales onto the chart
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (xScale! !== undefined) {
        variableSvg
          .append('g')
          .attr('transform', `translate(0, ${svgHeight})`)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .call((axisBottom as any)(xScale).ticks(4, 's'));
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (yScale! !== undefined) {
        console.log(props.mappedTo, yScale);
        variableSvg
          .append('g')
          .attr('transform', `translate(${yAxisPadding},0)`)
          .call(axisLeft(yScale).ticks(3, 's'));
      }

      // For the brushable charts for filtering add brushing
      if (props.brushable) {
        const brush = brushX()
          .extent([[yAxisPadding, 0], [variableSvgWidth, svgHeight]])
          .on('brush', (event: unknown) => {
            const brushEvent = event as D3BrushEvent<unknown>;
            const extent = brushEvent.selection;
            console.log(extent);
            // TODO: Fix the brushing logic to update the scales
          });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (variableSvg as any)
          .call(brush)
          // start with the whole graph brushed
          .call(brush.move, [yAxisPadding, variableSvgWidth - yAxisPadding]);
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
      v-else-if="selected"
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
                dark
                fab
                x-small
                depressed
                height="20"
                width="20"
                color="primary"
                style="padding-left: 2px;"
                v-bind="attrs"
                v-on="on"
              >
                <v-icon
                  :size="16"
                  class="icon pt-0"
                  dark
                >
                  mdi-chart-bubble
                </v-icon>
              </v-btn>
            </template>
            <v-card :width="256">
              <legend-chart
                :var-name="varName"
                :selected="false"
                :brushable="true"
                :type="'node'"
                class="pb-4"
              />
            </v-card>
          </v-menu>
        </v-row>
      </div>
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
        >
          mdi-drag-vertical
        </v-icon>
      </div>
    </div>

    <svg
      :id="`${type}${varName}${mappedTo}`"
      :height="svgHeight + 20"
      width="100%"
      class="mt-2"
    />
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
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>