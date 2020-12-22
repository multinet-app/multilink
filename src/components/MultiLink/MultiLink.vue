<script lang="ts">
import Vue from 'vue';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import {
  forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, Simulation,
} from 'd3-force';

import store from '@/store';
import { Node, Link, SimulationLink } from '@/types';

export default Vue.extend({
  props: {
    svgDimensions: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      straightEdges: false,
      tooltipMessage: '',
      toggleTooltip: false,
      tooltipPosition: { x: 0, y: 0 },
      el: null as Element | null,
      simulation: null as Simulation<Node, SimulationLink> | null,
      nestedPadding: 5,
    };
  },

  computed: {
    network() {
      return store.getters.network;
    },

    simulationLinks(): SimulationLink[] | null {
      if (this.network !== null) {
        return this.network.edges.map((link: Link) => {
          const newLink: SimulationLink = {
            ...JSON.parse(JSON.stringify(link)),
            source: link._from,
            target: link._to,
          };
          return newLink;
        });
      }
      return null;
    },

    selectedNodes() {
      return store.getters.selectedNodes;
    },

    oneHop() {
      if (this.network !== null) {
        const inNodes = this.network.edges.map((link) => (this.selectedNodes.has(link._to) ? link._from : null));
        const outNodes = this.network.edges.map((link) => (this.selectedNodes.has(link._from) ? link._to : null));

        const oneHopNodeIDs: Set<string | null> = new Set([...outNodes, ...inNodes]);

        // Remove null if it exists
        if (oneHopNodeIDs.has(null)) {
          oneHopNodeIDs.delete(null);
        }

        return oneHopNodeIDs;
      }
      return new Set();
    },

    nodeColorScale() {
      return store.getters.nodeColorScale;
    },

    tooltipStyle(): string {
      return `left: ${this.tooltipPosition.x}px; top: ${this.tooltipPosition.y}px`;
    },

    nodeTextStyle(): string {
      return `font-size: ${this.fontSize}pt;`;
    },

    svgOffset(): {x: number; y: number} {
      if (this.el === null) {
        return { x: 0, y: 0 };
      }

      return {
        x: (this.el as HTMLElement).offsetLeft,
        y: (this.el as HTMLElement).offsetTop,
      };
    },

    nestedBarWidth(): number {
      const hasGlyphs = this.nestedVariables.glyph.length !== 0;
      const totalColumns = this.nestedVariables.bar.length + (hasGlyphs ? 1 : 0);

      // Left padding + padding on right for each column
      const totalPadding = this.nestedPadding + totalColumns * this.nestedPadding;

      return (this.markerSize - totalPadding) / (totalColumns);
    },

    nestedBarHeight(): number {
      return this.markerSize - 24;
    },

    forceRadius(): number {
      return (this.markerSize / 2) * 1.5;
    },

    renderNested() {
      return store.getters.renderNested;
    },

    markerSize() {
      return store.getters.markerSize || 0;
    },

    fontSize() {
      return store.getters.fontSize || 0;
    },

    labelVariable() {
      return store.getters.labelVariable;
    },

    colorVariable() {
      return store.getters.colorVariable;
    },

    selectNeighbors() {
      return store.getters.selectNeighbors;
    },

    nestedVariables(): {bar: string[]; glyph: string[]} {
      return store.getters.nestedVariables;
    },

    linkVariables() {
      return store.getters.linkVariables;
    },

    attributeRanges() {
      return store.getters.attributeRanges;
    },

    attributeScales() {
      const scales: {[key: string]: ScaleLinear<number, number>} = {};

      if (Object.values(this.attributeRanges) !== undefined) {
        Object.values(this.attributeRanges).forEach((attr) => {
          scales[attr.attr] = scaleLinear()
            .domain([attr.min, attr.max])
            .range([0, this.nestedBarHeight]);
        });
      }
      return scales;
    },

    linkWidthScale() {
      return store.getters.linkWidthScale;
    },

    directionalEdges() {
      return store.getters.directionalEdges;
    },
  },

  created() {
    if (this.network !== null) {
      this.generateNodePositions(this.network.nodes);
    }
  },

  mounted() {
    this.el = this.$el;

    if (this.network !== null) {
      // Make the simulation
      const simulation = forceSimulation<Node, SimulationLink>()
        .force('center', forceCenter(this.el.clientWidth / 2, this.el.clientHeight / 2))
        .force('charge', forceManyBody().strength(-300))
        .force('link', forceLink().id((d) => { const datum = (d as Link); return datum._id; }))
        .force('collision', forceCollide(this.forceRadius));

      simulation
        .nodes(this.network.nodes);

      (simulation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .force('link') as any).links(this.simulationLinks);

      simulation.on('tick', () => {
        this.$forceUpdate();
      });

      store.commit.setSimulation(simulation);
    }
  },

  methods: {
    generateNodePositions(nodes: Node[]) {
      nodes.forEach((node) => {
        // If the position is not defined for x or y, generate it
        if (node.x === undefined || node.y === undefined) {
          // eslint-disable-next-line no-param-reassign
          node.x = Math.random() * this.svgDimensions.width;
          // eslint-disable-next-line no-param-reassign
          node.y = Math.random() * this.svgDimensions.height;
        }
      });
    },

    selectNode(node: Node) {
      if (this.selectedNodes.has(node._id)) {
        store.commit.removeSelectedNode(node._id);
      } else {
        store.commit.addSelectedNode(node._id);
      }
    },

    dragNode(node: Node, event: MouseEvent) {
      event.preventDefault();

      const moveFn = (evt: Event) => {
        // eslint-disable-next-line no-param-reassign
        node.x = (evt as MouseEvent).clientX - this.svgOffset.x - (this.markerSize / 2);
        // eslint-disable-next-line no-param-reassign
        node.y = (evt as MouseEvent).clientY - this.svgOffset.y - (this.markerSize / 2);
        this.$forceUpdate();
      };

      const stopFn = () => {
        (this.$refs.svg as Element).removeEventListener('mousemove', moveFn);
        (this.$refs.svg as Element).removeEventListener('mouseup', stopFn);
      };

      (this.$refs.svg as Element).addEventListener('mousemove', moveFn);
      (this.$refs.svg as Element).addEventListener('mouseup', stopFn);
    },

    showTooltip(element: Node | Link, event: MouseEvent) {
      this.tooltipPosition = {
        x: event.clientX,
        y: event.clientY,
      };

      this.tooltipMessage = element._id;
      this.toggleTooltip = true;
    },

    hideTooltip() {
      this.tooltipMessage = '';
      this.toggleTooltip = false;
    },

    nodeTranslate(node: Node): string {
      let forcedX = node.x || 0;
      let forcedY = node.y || 0;

      const svgEdgePadding = 5;

      const minimumX = svgEdgePadding;
      const minimumY = svgEdgePadding;
      const maximumX = this.svgDimensions.width - this.markerSize - svgEdgePadding;
      const maximumY = this.svgDimensions.height - this.markerSize - svgEdgePadding;

      // Ideally we would update node.x and node.y, but those variables are being changed
      // by the simulation. My solution was to use these forcedX and forcedY variables.
      if (forcedX < minimumX) { forcedX = minimumX; }
      if (forcedX > maximumX) { forcedX = maximumX; }
      if (forcedY < minimumY) { forcedY = minimumY; }
      if (forcedY > maximumY) { forcedY = maximumY; }

      // Update the node position with this forced position
      // eslint-disable-next-line no-param-reassign
      node.x = forcedX;
      // eslint-disable-next-line no-param-reassign
      node.y = forcedY;

      // Use the forced position, because the node.x is updated by simulation
      return `translate(${forcedX}, ${forcedY})`;
    },

    arcPath(link: Link): string {
      if (this.network !== null) {
        const fromNode = this.network.nodes.find((node) => node._id === link._from);
        const toNode = this.network.nodes.find((node) => node._id === link._to);

        if (fromNode === undefined || toNode === undefined) {
          throw new Error('Couldn\'t find the source or target for a link, didn\'t draw arc.');
        }

        if (fromNode.x === undefined || fromNode.y === undefined || toNode.x === undefined || toNode.y === undefined) {
          throw new Error('_from or _to node didn\'t have an x or a y position.');
        }

        const x1 = fromNode.x + this.markerSize / 2;
        const y1 = fromNode.y + this.markerSize / 2;
        const x2 = toNode.x + this.markerSize / 2;
        const y2 = toNode.y + this.markerSize / 2;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dr = Math.sqrt(dx * dx + dy * dy);
        const sweep = 1;
        const xRotation = 0;
        const largeArc = 0;

        if (this.straightEdges) {
          return (`M ${x1} ${y1} L ${x2} ${y2}`);
        }
        return (`M ${x1}, ${y1} A ${dr}, ${dr} ${xRotation}, ${largeArc}, ${sweep} ${x2},${y2}`);
      }
      return '';
    },

    isSelected(nodeID: string): boolean {
      return this.selectedNodes.has(nodeID);
    },

    nodeGroupClass(node: Node): string {
      if (this.selectedNodes.size > 0) {
        const selected = this.isSelected(node._id);
        const inOneHop = this.selectNeighbors ? this.oneHop.has(node._id) : false;
        const selectedClass = selected || inOneHop ? '' : 'muted';
        return `nodeGroup ${selectedClass}`;
      }
      return 'nodeGroup';
    },

    nodeClass(node: Node): string {
      const selected = this.isSelected(node._id);
      const selectedClass = selected ? 'selected' : '';

      return `node nodeBox nodeBorder ${selectedClass}`;
    },

    linkGroupClass(link: Link): string {
      if (this.selectedNodes.size > 0) {
        const selected = this.isSelected(link._from) || this.isSelected(link._to);
        const selectedClass = selected && this.selectNeighbors ? '' : 'muted';
        return `linkGroup ${selectedClass}`;
      }
      return 'linkGroup';
    },

    linkStyle(link: Link): string {
      const linkColor = this.linkVariables.color === '' ? '#888888' : this.nodeColorScale(link[this.linkVariables.color]);
      const linkWidth = this.linkVariables.width === '' ? 1 : this.linkWidthScale(link[this.linkVariables.width]);

      return `stroke: ${linkColor}; stroke-width: ${linkWidth}px;`;
    },

    glyphStyle(value: string) {
      return `fill: ${this.nodeColorScale(value)};`;
    },
  },
});
</script>

<template>
  <div>
    <svg
      ref="svg"
      :width="svgDimensions.width"
      :height="svgDimensions.height"
    >
      <g
        class="links"
      >
        <g
          v-for="link of network.edges"
          :key="link._id"
          :class="linkGroupClass(link)"
          @mouseover="showTooltip(link, $event)"
          @mouseout="hideTooltip"
        >
          <path
            :id="`${link._key}_path`"
            class="link"
            :d="arcPath(link)"
            :style="linkStyle(link)"
          />

          <text
            v-if="directionalEdges"
            dominant-baseline="middle"
          >
            <textPath
              :href="`#${link._key}_path`"
              startOffset="50%"
            >
              ▶
            </textPath>
          </text>
        </g>
      </g>

      <g class="nodes">
        <g
          v-for="node of network.nodes"
          :key="node._id"
          :transform="nodeTranslate(node)"
          :class="nodeGroupClass(node)"
        >
          <rect
            :class="nodeClass(node)"
            :width="markerSize"
            :height="markerSize"
            :fill="nodeColorScale(node[colorVariable])"
            :rx="!renderNested ? (markerSize / 2) : 0"
            :ry="!renderNested ? (markerSize / 2) : 0"
            @click="selectNode(node)"
            @mouseover="showTooltip(node, $event)"
            @mouseout="hideTooltip"
            @mousedown="dragNode(node, $event)"
          />
          <rect
            class="labelBackground"
            height="1em"
            :y="!renderNested ? (markerSize / 2) - 8 : 0"
            :width="markerSize"
          />
          <text
            class="label"
            :dy="!renderNested ? markerSize / 2 + 2: 10"
            :dx="markerSize / 2"
            :style="nodeTextStyle"
          >{{ node[labelVariable] }}</text>

          <g
            v-if="renderNested"
            class="nested"
          >

            <!-- White background bar -->
            <rect
              v-for="(barVar, i) of nestedVariables.bar"
              :key="`${node}_${barVar}_background`"
              class="bar"
              :width="nestedBarWidth"
              :height="nestedBarHeight"
              style="fill: white;"
              :x="((nestedBarWidth + nestedPadding) * i) + nestedPadding"
              y="20"
            />

            <!-- Foreground colored bar -->
            <rect
              v-for="(barVar, i) of nestedVariables.bar"
              :key="`${node}_${barVar}_foreground`"
              class="bar"
              :width="nestedBarWidth"
              :height="attributeScales[barVar](node[barVar])"
              style="fill: blue;"
              :x="((nestedBarWidth + nestedPadding) * i) + nestedPadding"
              :y="20 + nestedBarHeight - attributeScales[barVar](node[barVar])"
            />

            <!-- Glyphs -->
            <rect
              v-for="(glyphVar, i) of nestedVariables.glyph"
              :key="`${node}_${glyphVar}_glyph`"
              class="glyph"
              :width="nestedBarWidth"
              :height="nestedBarHeight/2/nestedVariables.glyph.length"
              :y="20 + (i * (nestedBarHeight/2/nestedVariables.glyph.length + 5))"
              :x="((nestedBarWidth + nestedPadding) * nestedVariables.bar.length) + nestedPadding"
              rx="100"
              ry="100"
              :style="glyphStyle(node[glyphVar])"
            />
            <g />
          </g>
        </g>
      </g>
    </svg>

    <div
      v-if="toggleTooltip"
      class="tooltip"
      :style="tooltipStyle"
    >
      ID: {{ tooltipMessage }}
    </div>
  </div>
</template>

<style scoped>
.tooltip {
  position: absolute;
  background-color: white;

  font-size: 12.5px;
  color: #000;
  border-radius: 5px;
  padding: 5px;
  pointer-events: none;
  -webkit-box-shadow: 0 4px 8px 0 rgba(0,0,0,.2);
  box-shadow: 0 4px 8px 0 rgba(0,0,0,.2);
  max-width: 400px
}

.links >>> path,
.edgeLegend {
    fill: none;
    opacity: .8;
}

.bar, .glyph, .nested {
  pointer-events: none;
}

.axisLine {
    stroke-width: 2px;
    stroke: black;
}

.sizeCircle {
    fill: rgb(110, 110, 110);
}

.nodeBorder {
    stroke-width: 7px;
    stroke: white;
}

.label {
    fill: #3a3a3a;
    text-anchor: middle;
    dominant-baseline: middle;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: -moz-none;
    -o-user-select: none;
    user-select: none;
}

.selectBox {
    stroke: rgb(94, 94, 94);
    fill: white;
    stroke-width: 2px;
}

.label,
.selectBox,
.labelBackground {
    pointer-events: none;
}

.legendLabel,
.catLegend {
    font-size: 1em;
}

.muted {
    opacity: .2;
}

.hideLabel {
    visibility: hidden;
}

.frame {
    fill: white;
    stroke-width: 1px;
    stroke: black;
}

.barGroup>.bar {
    stroke-width: 2px;
    stroke: white;
    fill: rgb(167, 197, 158);
}

.nodeGroup {
    cursor: pointer;
}

#node-link-svg {
    display: inline-flex;
}

#disableInteraction {
    fill: white;
    opacity: .7;
}

.input {
    width: 60% !important;
}

.input.searchInput {
    width: 65% !important;
}

.node {
    stroke-width: 1px;
    stroke: rgb(200, 200, 200);
}

.node.selected {
    stroke-width: 6px;
    stroke: #F8CF91;
}

.selected .labelBackground.nested {
    fill: #ea9b0f;
    opacity: .6;
}

#finished,
#next,
#previous {
    margin: 50px 0px 0px 0px;
    padding: 10px;
    background-color: rgb(3, 93, 158);
    color: white;
    font-size: 20px;
    font-weight: bold;
}

.button.clicked {
    color: rgb(217, 99, 3) !important;
}

.button.condition {
    margin: 0px 0px 0px 10px;
    background-color: rgb(192, 192, 192);
    color: rgb(57, 57, 57);
    font-weight: bold;
}

.labelBackground.nested {
    opacity: .2;
    fill: rgb(112, 112, 112);
}

.labelBackground {
    opacity: .4;
    fill: rgb(255, 255, 255);
}

#vis {
    display: flex;
}

.ticks {
    font-size: 12px;
}

</style>
