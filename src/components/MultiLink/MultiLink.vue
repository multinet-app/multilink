<script lang="ts">
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

import store from '@/store';
import { Node, Link } from '@/types';

export default {
  props: {
    svgDimensions: {
      type: Object,
      required: true,
    },
  },

  data() {
    return {
      colorVariable: 'group',
      nodeSize: 50,
      nodeFontSize: 12,
      straightEdges: false,
      tooltipMessage: '',
      toggleTooltip: false,
      tooltipPosition: { x: 0, y: 0 },
    };
  },

  computed: {
    network() {
      return store.getters.network;
    },

    selectedNodes() {
      return store.getters.selectedNodes;
    },

    oneHop() {
      console.log('one hop');
      if (this.network !== null) {
        console.log(this.network, this.selectedNodes);
        const inNodes = this.network.edges.map((link) => (this.selectedNodes.has(link._to) ? link._from : null));
        const outNodes = this.network.edges.map((link) => (this.selectedNodes.has(link._from) ? link._to : null));

        const oneHopNodeIDs: Set<string | null> = new Set([...outNodes, ...inNodes]);

        // Remove null if it exists
        if (oneHopNodeIDs.has(null)) {
          oneHopNodeIDs.delete(null);
        }
        console.log(oneHopNodeIDs);

        return oneHopNodeIDs;
      }
      return new Set();
    },

    nodeColorScale() {
      return scaleOrdinal(schemeCategory10);
    },
    tooltipStyle(): string {
      return `left: ${this.tooltipPosition.x}px; top: ${this.tooltipPosition.y}px`;
    },
    },
  },

  created() {
    if (this.network !== null) {
      this.generateNodePositions(this.network.nodes);
    }
  },


  methods: {
    generateNodePositions(nodes: Node[]) {
      nodes.forEach((node) => {
        // If the position is not defined for x or y, generate it
        if (node.x === undefined || node.y === undefined) {
          node.x = Math.random() * this.svgDimensions.width;
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
      return `translate(${node.x || 0}, ${node.y || 0})`;
    },

    arcPath(link: Link): string {
      if (this.network !== null) {
        const fromNode = this.network.nodes.find((node) => node._id === link._from);
        const toNode = this.network.nodes.find((node) => node._id === link._to);

        if (fromNode === undefined || toNode === undefined) {
          console.log('Couldn\'t find the source or target for a link, didn\'t draw arc.');
          return '';
        }

        if (fromNode.x === undefined || fromNode.y === undefined || toNode.x === undefined || toNode.y === undefined) {
          console.log('_from or _to node didn\'t have an x or a y position.');
          return '';
        }

        const x1 = fromNode.x + this.nodeSize / 2;
        const y1 = fromNode.y + this.nodeSize / 2;
        const x2 = toNode.x + this.nodeSize / 2;
        const y2 = toNode.y + this.nodeSize / 2;

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
        const inOneHop = this.oneHop.has(node._id);
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

    nodeTextStyle(): string {
      return `font-size: ${this.nodeFontSize}pt;`;
    },

      // Set up groups for nodes/links
      this.svg.append('g').attr('class', 'links');
      this.svg.append('g').attr('class', 'nodes');

      // Call update vis to append all the data to the svg
      this.updateVis(this.provenance);
    },
  },
};
</script>

<template>
  <div>
    <svg
      ref="svg"
      :width="svgDimensions.width"
      :height="svgDimensions.height"
    >
      <g class="nodes">
        <g
          v-for="node of network.nodes"
          :key="node._id"
          :transform="nodeTranslate(node)"
          :class="nodeGroupClass(node)"
        >
          <rect
            :class="nodeClass(node)"
            :width="nodeSize"
            :height="nodeSize"
            :fill="nodeColorScale(node[colorVariable])"
            rx="25"
            ry="25"
            @click="selectNode(node)"
          />
          <rect
            class="labelBackground"
            height="1em"
            :y="(nodeSize / 2) - 8"
            :width="nodeSize"
          />
          <text
            class="label"
            :dy="nodeSize / 2 + 2"
            :dx="nodeSize / 2"
            :style="nodeTextStyle"
          >{{ node._id }}</text>
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

.links,
.textpath,
.edgeLegend {
    fill: none;
    opacity: .8;
}

.textpath {
    visibility: hidden;
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

.pathLabel>textPath {
    font-size: 14px;
}

.edgeArrow>textPath {
    font-size: 10px;
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
