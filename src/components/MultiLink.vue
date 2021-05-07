<script lang="ts">
import Vue from 'vue';
import {
  scaleLinear, ScaleLinear,
} from 'd3-scale';
import {
  forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, Simulation,
} from 'd3-force';

import store from '@/store';
import {
  Node, Link, SimulationLink, Dimensions,
} from '@/types';

import ContextMenu from '@/components/ContextMenu.vue';
import { applyForceToSimulation } from '@/lib/d3ForceUtils';

export default Vue.extend({
  components: {
    ContextMenu,
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
      rectSelect: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        transformX: 0,
        transformY: 0,
      },
    };
  },

  computed: {
    network() {
      return store.state.network;
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
      return store.state.selectedNodes;
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

    nodeBarColorScale() {
      return store.state.nodeBarColorScale;
    },

    nodeGlyphColorScale() {
      return store.state.nodeGlyphColorScale;
    },

    tooltipStyle(): string {
      return `left: ${this.tooltipPosition.x}px; top: ${this.tooltipPosition.y}px`;
    },

    nodeTextStyle(): string {
      return `font-size: ${this.fontSize}pt;`;
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

    displayCharts() {
      return store.state.displayCharts;
    },

    markerSize() {
      return store.state.markerSize || 0;
    },

    fontSize() {
      return store.state.fontSize || 0;
    },

    labelVariable() {
      return store.state.labelVariable;
    },

    nodeColorVariable() {
      return store.state.nodeColorVariable;
    },

    selectNeighbors() {
      return store.state.selectNeighbors;
    },

    nestedVariables(): {bar: string[]; glyph: string[]} {
      return store.state.nestedVariables;
    },

    linkVariables() {
      return store.state.linkVariables;
    },

    nodeSizeVariable() {
      return store.state.nodeSizeVariable;
    },

    attributeRanges() {
      return store.state.attributeRanges;
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
      return store.state.linkWidthScale;
    },

    svgDimensions(): Dimensions {
      const { height } = this.$vuetify.breakpoint;
      const width = this.$vuetify.breakpoint.width - this.controlsWidth;

      applyForceToSimulation(
        store.state.simulation,
        'center',
        forceCenter<Node>(width / 2, height / 2),
      );
      store.commit.startSimulation();

      const dimensions = {
        height,
        width,
      };

      store.commit.setSvgDimensions(dimensions);

      return dimensions;
    },

    directionalEdges() {
      return store.state.directionalEdges;
    },

    controlsWidth(): number {
      return store.state.controlsWidth;
    },

    nodeSizeScale(): ScaleLinear<number, number> | null {
      if (this.network === null) { return null; }
      const values = this.network.nodes.map((node) => node[this.nodeSizeVariable]);

      return scaleLinear()
        .domain([Math.min(...values), Math.max(...values)])
        .range([10, 100]);
    },

    linkColorScale() {
      return store.getters.linkColorScale;
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
        .force('center', forceCenter(this.svgDimensions.width / 2, this.svgDimensions.height / 2))
        .force('charge', forceManyBody<Node>().strength(-250))
        .force('link', forceLink<Node, SimulationLink>().id((d) => { const datum = (d as Link); return datum._id; }))
        .force('collision', forceCollide((this.markerSize / 2) * 1.5));

      simulation
        .nodes(this.network.nodes);

      (simulation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .force('link') as any).links(this.simulationLinks);

      simulation
        .on('tick', () => {
          this.$forceUpdate();
        })
        // The next line handles the start stop button change in the controls.
        // It's not explicitly necessary for the simulation to work
        .on('end', () => {
          store.commit.stopSimulation();
        });

      store.commit.setSimulation(simulation);
      store.commit.startSimulation();
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
        store.commit.addSelectedNode([node._id]);
      }
    },

    dragNode(node: Node, event: MouseEvent) {
      if (!(this.$refs.svg instanceof Element)) {
        throw new Error('SVG is not of type Element');
      }

      event.stopPropagation();

      const moveFn = (evt: Event) => {
        // Check we have a mouse event
        if (!(evt instanceof MouseEvent)) {
          throw new Error('event is not MouseEvent');
        }

        const eventX = evt.x - this.controlsWidth - (this.calculateNodeSize(node) / 2);
        const eventY = evt.y - (this.calculateNodeSize(node) / 2);

        if (this.selectedNodes.has(node._id)) {
          const nodeX = Math.floor(node.x || 0);
          const nodeY = Math.floor(node.y || 0);
          const dx = eventX - nodeX;
          const dy = eventY - nodeY;

          if (this.network !== null) {
            this.network.nodes
              .filter((innerNode) => this.selectedNodes.has(innerNode._id) && innerNode._id !== node._id)
              .forEach((innerNode) => {
              // eslint-disable-next-line no-param-reassign
                innerNode.x = (innerNode.x || 0) + dx;
                // eslint-disable-next-line no-param-reassign
                innerNode.y = (innerNode.y || 0) + dy;
              });
          }
        }

        // eslint-disable-next-line no-param-reassign
        node.x = eventX;
        // eslint-disable-next-line no-param-reassign
        node.y = eventY;
        this.$forceUpdate();
      };

      const stopFn = () => {
        if (!(this.$refs.svg instanceof Element)) {
          throw new Error('SVG is not of type Element');
        }
        this.$refs.svg.removeEventListener('mousemove', moveFn);
        this.$refs.svg.removeEventListener('mouseup', stopFn);
      };

      this.$refs.svg.addEventListener('mousemove', moveFn);
      this.$refs.svg.addEventListener('mouseup', stopFn);
    },

    showTooltip(element: Node | Link, event: MouseEvent) {
      this.tooltipPosition = {
        x: event.clientX - this.controlsWidth,
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
      const maximumX = this.svgDimensions.width - this.calculateNodeSize(node) - svgEdgePadding;
      const maximumY = this.svgDimensions.height - this.calculateNodeSize(node) - svgEdgePadding;

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

        const x1 = fromNode.x + this.calculateNodeSize(fromNode) / 2;
        const y1 = fromNode.y + this.calculateNodeSize(fromNode) / 2;
        const x2 = toNode.x + this.calculateNodeSize(toNode) / 2;
        const y2 = toNode.y + this.calculateNodeSize(toNode) / 2;

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

      return `node nodeBox ${selectedClass}`;
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
      const linkColor = this.linkVariables.color === '' ? '#888888' : this.linkColorScale(link[this.linkVariables.color]);
      const linkWidth = this.linkVariables.width === '' ? 1 : this.linkWidthScale(link[this.linkVariables.width]);

      return `stroke: ${linkColor}; stroke-width: ${linkWidth}px;`;
    },

    glyphStyle(value: string) {
      return `fill: ${this.nodeGlyphColorScale(value)};`;
    },

    calculateNodeSize(node: Node) {
      // Don't render dynamic node size if the size variable is empty or
      // we want to display charts
      if (this.nodeSizeVariable === '' || this.displayCharts || this.nodeSizeScale === null) {
        return this.markerSize;
      }

      return this.nodeSizeScale(node[this.nodeSizeVariable]);
    },

    rectSelectDrag(event: MouseEvent) {
      // Only drag on left clicks
      if (event.button !== 0) {
        return;
      }

      // Set initial location for box (pins one corner)
      this.rectSelect = {
        x: event.x - this.controlsWidth,
        y: event.y,
        width: 0,
        height: 0,
        transformX: 0,
        transformY: 0,
      };

      const moveFn = (evt: Event) => {
        // Check we have a mouse event
        if (!(evt instanceof MouseEvent)) {
          throw new Error('event is not MouseEvent');
        }

        // Get event location
        const mouseX = evt.x - this.controlsWidth;
        const mouseY = evt.y;

        // Check if we need to translate (case when mouse is left/above initial click)
        const translateX = mouseX < this.rectSelect.x;
        const translateY = mouseY < this.rectSelect.y;

        // Set the parameters
        this.rectSelect = {
          x: this.rectSelect.x,
          y: this.rectSelect.y,
          width: Math.abs(this.rectSelect.x - mouseX),
          height: Math.abs(this.rectSelect.y - mouseY),
          transformX: translateX ? -Math.abs(this.rectSelect.x - mouseX) : 0,
          transformY: translateY ? -Math.abs(this.rectSelect.y - mouseY) : 0,
        };
      };

      const stopFn = () => {
        const boxX1 = Math.min(this.rectSelect.x + this.rectSelect.transformX, this.rectSelect.x);
        const boxX2 = boxX1 + this.rectSelect.width;
        const boxY1 = Math.min(this.rectSelect.y + this.rectSelect.transformY, this.rectSelect.y);
        const boxY2 = boxY1 + this.rectSelect.height;

        // Find which nodes are in the box
        let nodesInRect: Node[] = [];
        if (this.network !== null) {
          nodesInRect = this.network.nodes.filter((node) => {
            const nodeSize = this.calculateNodeSize(node) / 2;
            return (node.x || 0) + nodeSize > boxX1
              && (node.x || 0) + nodeSize < boxX2
              && (node.y || 0) + nodeSize > boxY1
              && (node.y || 0) + nodeSize < boxY2;
          });
        }

        // Select the nodes inside the box if there are any
        store.commit.addSelectedNode(nodesInRect.map((node) => node._id));

        // Remove the listeners so that the box stops updating location
        if (!(this.$refs.svg instanceof Element)) {
          throw new Error('SVG is not of type Element');
        }
        this.$refs.svg.removeEventListener('mousemove', moveFn);
        this.$refs.svg.removeEventListener('mouseup', stopFn);

        // Remove the selection box
        this.rectSelect = {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          transformX: 0,
          transformY: 0,
        };
      };

      if (!(this.$refs.svg instanceof Element)) {
        throw new Error('SVG is not of type Element');
      }
      this.$refs.svg.addEventListener('mousemove', moveFn);
      this.$refs.svg.addEventListener('mouseup', stopFn);
    },

    showContextMenu(event: MouseEvent) {
      store.commit.updateRightClickMenu({
        show: true,
        top: event.y,
        left: event.x,
      });

      event.preventDefault();
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
      @mousedown="rectSelectDrag"
      @contextmenu="showContextMenu"
    >
      <rect
        id="rect-select"
        :x="rectSelect.x"
        :y="rectSelect.y"
        :width="rectSelect.width"
        :height="rectSelect.height"
        :transform="`translate(${rectSelect.transformX}, ${rectSelect.transformY})`"
        fill="none"
        stroke="black"
        stroke-width="2px"
        stroke-dasharray="5,5"
      />

      <g
        class="links"
        fill="none"
        alpha="0.8"
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
            y="1"
          >
            <textPath
              :href="`#${link._key}_path`"
              startOffset="50%"
              fill="#888888"
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
            :width="calculateNodeSize(node)"
            :height="calculateNodeSize(node)"
            :fill="!displayCharts ? nodeGlyphColorScale(node[nodeColorVariable]) : '#DDDDDD'"
            :rx="!displayCharts ? (calculateNodeSize(node) / 2) : 0"
            :ry="!displayCharts ? (calculateNodeSize(node) / 2) : 0"
            @click="selectNode(node)"
            @mouseover="showTooltip(node, $event)"
            @mouseout="hideTooltip"
            @mousedown="dragNode(node, $event)"
          />
          <rect
            class="labelBackground"
            height="1em"
            :y="!displayCharts ? (calculateNodeSize(node) / 2) - 8 : 0"
            :width="calculateNodeSize(node)"
          />
          <text
            class="label"
            dominant-baseline="middle"
            fill="#3a3a3a"
            text-anchor="middle"
            :dy="!displayCharts ? calculateNodeSize(node) / 2 + 2: 10"
            :dx="calculateNodeSize(node) / 2"
            :style="nodeTextStyle"
          >{{ node[labelVariable] }}</text>

          <g
            v-if="displayCharts"
          >

            <!-- White background bar -->
            <rect
              v-for="(barVar, i) of nestedVariables.bar"
              :key="`${node}_${barVar}_background`"
              class="bar"
              :width="nestedBarWidth"
              :height="nestedBarHeight"
              fill="#FFFFFF"
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
              :fill="nodeBarColorScale(barVar)"
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

    <context-menu />
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

.label,
.labelBackground,
.bar,
.glyph {
  pointer-events: none;
}

.muted {
  opacity: 0.2;
}

.nodeGroup {
  cursor: pointer;
}

.node.selected {
  stroke-width: 6px;
  stroke: #F8CF91;
}

.labelBackground {
  opacity: .4;
  fill: rgb(255, 255, 255);
}
</style>
