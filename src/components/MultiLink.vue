<script lang="ts">
import Vue from 'vue';
import { scaleLinear, ScaleLinear } from 'd3-scale';
import {
  forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, Simulation,
} from 'd3-force';

import store from '@/store';
import {
  Node, Link, SimulationLink, Dimensions,
} from '@/types';
import { select, selectAll } from 'd3-selection';

export default Vue.extend({
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
      linkStyles: {} as { [linkID: string]: string },
      glyphStyles: {} as {
        [glyphVar: string]: { [nodeID: string]: string };
      },
      nodeSizes: {} as { [nodeID: string]: number },
      nodeGroupClasses: {} as { [nodeID: string]: string },
      linkGroupClasses: {} as { [linkID: string]: string },
      dragging: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodes: undefined as any,
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

    nodeBarColorScale() {
      return store.getters.nodeBarColorScale;
    },

    nodeGlyphColorScale() {
      return store.getters.nodeGlyphColorScale;
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
      return store.getters.displayCharts;
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

    nodeColorVariable() {
      return store.getters.nodeColorVariable;
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

    nodeSizeVariable() {
      return store.getters.nodeSizeVariable;
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

    svgDimensions(): Dimensions {
      const { height } = this.$vuetify.breakpoint;
      const width = this.$vuetify.breakpoint.width - this.controlsWidth;

      store.dispatch.updateSimulationForce({ forceType: 'center', forceValue: forceCenter<Node>(width / 2, height / 2), restart: false });

      return {
        height,
        width,
      };
    },

    directionalEdges() {
      return store.getters.directionalEdges;
    },

    controlsWidth(): number {
      return store.getters.controlsWidth;
    },

    nodeSizeScale(): ScaleLinear<number, number> | null {
      if (this.network === null) { return null; }
      const values = this.network.nodes.map((node) => node[this.nodeSizeVariable]);

      return scaleLinear()
        .domain([Math.min(...values), Math.max(...values)])
        .range([10, 100]);
    },
  },

  watch: {
    linkVariables() {
      this.updateLinkStyles();
      this.$forceUpdate();
    },

    nestedVariables() {
      this.updateGlyphStyles();
      this.$forceUpdate();
    },

    markerSize() {
      this.updateNodeSizes();
      this.$forceUpdate();
    },

    nodeSizeVariable() {
      this.updateNodeSizes();
      this.$forceUpdate();
    },

    selectedNodes() {
      this.updateNodeGroupClasses();
      this.updateLinkGroupClasses();
      this.$forceUpdate();
    },
  },

  created() {
    if (this.network !== null) {
      // Initialize node positions and node sizes
      this.generateNodePositions(this.network.nodes);
      this.updateNodeSizes();
    }
  },

  mounted() {
    this.el = this.$el;

    if (this.network !== null) {
      // Initialize link sytles, glyph styles, node group style, and link group style
      this.updateLinkStyles();
      this.updateGlyphStyles();
      this.updateNodeGroupClasses();
      this.updateLinkGroupClasses();

      // Make the nodes
      this.nodes = select('.nodes')
        .selectAll('.nodeGroup')
        .data(new Array(77));

      const nodesEnter = this.nodes
        .enter()
        .append('g')
        .attr('class', 'nodeGroup')
        .attr('transform', () => `translate(${Math.random() * this.svgDimensions.width}, ${Math.random() * this.svgDimensions.height})`);

      nodesEnter
        .append('rect')
        .attr('class', 'node')
        .attr('width', '50')
        .attr('height', '50')
        .attr('rx', '25')
        .attr('ry', '25')
        .attr('fill', '#DDDDDD');

      nodesEnter
        .append('rect')
        .attr('class', 'labelBackground')
        .attr('height', '1em')
        .attr('width', '50')
        .attr('y', '25 - 8');

      nodesEnter
        .append('text')
        .attr('class', 'label')
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'middle')
        .attr('fill', '#3a3a3a')
        .attr('dx', '25')
        .attr('dy', '25 + 2')
        .text('hi');

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
          selectAll('.nodeGroup').data(new Array(77)).attr('transform', () => `translate(${Math.random() * this.svgDimensions.width}, ${Math.random() * this.svgDimensions.height})`);
          simulation.nodes().forEach((node) => this.forcePosition(node));
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
        this.dragging = true;
        // Check we have a mouse event
        if (!(evt instanceof MouseEvent)) {
          throw new Error('event is not MouseEvent');
        }

        // eslint-disable-next-line no-param-reassign
        node.x = evt.x - this.controlsWidth - (this.nodeSizes[node._id] / 2);
        // eslint-disable-next-line no-param-reassign
        node.y = evt.y - (this.nodeSizes[node._id] / 2);
        this.forcePosition(node);
        this.$forceUpdate();
      };

      const stopFn = () => {
        if (!(this.$refs.svg instanceof Element)) {
          throw new Error('SVG is not of type Element');
        }
        this.$refs.svg.removeEventListener('mousemove', moveFn);
        this.$refs.svg.removeEventListener('mouseup', stopFn);
        this.dragging = false;
      };

      this.$refs.svg.addEventListener('mousemove', moveFn);
      this.$refs.svg.addEventListener('mouseup', stopFn);
    },

    showTooltip(element: Node | Link, event: MouseEvent) {
      if (this.dragging) {
        return;
      }

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

    forcePosition(node: Node) {
      const svgEdgePadding = 5;
      const minimumX = svgEdgePadding;
      const minimumY = svgEdgePadding;
      if (node.x === undefined || node.y === undefined) {
        return;
      }
      const maximumX = this.svgDimensions.width - this.nodeSizes[node._id] - svgEdgePadding;
      const maximumY = this.svgDimensions.height - this.nodeSizes[node._id] - svgEdgePadding;

      // eslint-disable-next-line no-param-reassign
      if (node.x < minimumX) { node.x = minimumX; }
      // eslint-disable-next-line no-param-reassign
      if (node.x > maximumX) { node.x = maximumX; }
      // eslint-disable-next-line no-param-reassign
      if (node.y < minimumY) { node.y = minimumY; }
      // eslint-disable-next-line no-param-reassign
      if (node.y > maximumY) { node.y = maximumY; }
    },

    arcPath(link: SimulationLink): string {
      if (this.network !== null) {
        if (typeof link.source === 'string' || typeof link.target === 'string') {
          // Silently fail if the nodes haven't been initialized yet (this only happens on first render and resolves itself quickly)
          return '';
        }

        if (link.source.x === undefined || link.source.y === undefined || link.target.x === undefined || link.target.y === undefined) {
          throw new Error('_from or _to node didn\'t have an x or a y position.');
        }

        const fromRadius = this.nodeSizes[link.source._id] / 2;
        const toRadius = this.nodeSizes[link.target._id] / 2;
        const x1 = link.source.x + fromRadius;
        const y1 = link.source.y + fromRadius;
        const x2 = link.target.x + toRadius;
        const y2 = link.target.y + toRadius;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dr = Math.sqrt(dx * dx + dy * dy);

        if (this.straightEdges) {
          return (`M ${x1} ${y1} L ${x2} ${y2}`);
        }
        return (`M ${x1}, ${y1} A ${dr}, ${dr} 0, 0, 1 ${x2},${y2}`);
      }
      return '';
    },

    isSelected(nodeID: string): boolean {
      return this.selectedNodes.has(nodeID);
    },

    updateNodeGroupClasses() {
      if (this.network === null) {
        return;
      }

      this.network.nodes.forEach((node) => {
        let muted = '';
        let selected = '';

        if (this.selectedNodes.size > 0) {
          selected = this.isSelected(node._id) ? 'selected' : '';
          const inOneHop = this.selectNeighbors ? this.oneHop.has(node._id) : false;
          muted = selected || inOneHop ? '' : 'muted';
        }

        this.nodeGroupClasses[node._id] = `nodeGroup ${selected} ${muted}`;
      });
    },

    updateLinkGroupClasses() {
      if (this.network === null) {
        return;
      }

      this.network.edges.forEach((link) => {
        let muted = '';
        let selected = false;

        if (this.selectedNodes.size > 0) {
          selected = this.isSelected(link._from) || this.isSelected(link._to);
          muted = selected && this.selectNeighbors ? '' : 'muted';
        }

        this.linkGroupClasses[link._id] = `linkGroup ${muted}`;
      });
    },

    updateLinkStyles() {
      if (this.network === null) {
        return;
      }

      this.network.edges.forEach((link) => {
        const linkColor = this.linkVariables.color === '' ? '#888888' : this.nodeGlyphColorScale(link[this.linkVariables.color]);
        const linkWidth = this.linkVariables.width === '' ? 1 : this.linkWidthScale(link[this.linkVariables.width]);

        this.linkStyles[link._id] = `stroke: ${linkColor}; stroke-width: ${linkWidth}px;`;
      });
    },

    updateGlyphStyles() {
      this.nestedVariables.glyph.forEach((glyphVar) => {
        // Check network exists
        if (this.network === null) {
          return;
        }

        // Initialize empty object
        this.glyphStyles[glyphVar] = {};

        // Compute the style string for each node for one glyphVar
        this.network.nodes.forEach((node) => {
          this.glyphStyles[glyphVar][node._id] = `fill: ${this.nodeGlyphColorScale(node[glyphVar])};`;
        });
      });
    },

    updateNodeSizes() {
      if (this.network === null) {
        return;
      }
      // Don't render dynamic node size if the size variable is empty or
      // we want to display charts
      const constantSize = this.nodeSizeVariable === '' || this.displayCharts;

      this.network.nodes.forEach((node) => {
        this.nodeSizes[node._id] = !constantSize && this.nodeSizeScale !== null
          ? this.nodeSizeScale(node[this.nodeSizeVariable])
          : this.markerSize;
      });
    },

    rectSelectDrag(event: MouseEvent) {
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
        this.dragging = true;

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
            const nodeSize = this.nodeSizes[node._id] / 2;
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

        this.dragging = false;
      };

      if (!(this.$refs.svg instanceof Element)) {
        throw new Error('SVG is not of type Element');
      }
      this.$refs.svg.addEventListener('mousemove', moveFn);
      this.$refs.svg.addEventListener('mouseup', stopFn);
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
          v-for="link of simulationLinks"
          :key="link._id"
          :class="linkGroupClasses[link._id]"
          @mouseover="showTooltip(link, $event)"
          @mouseout="hideTooltip"
        >
          <line
            :x1="link.source.x + 25"
            :y1="link.source.y + 25"
            :x2="link.target.x + 25"
            :y2="link.target.y + 25"
            :style="linkStyles[link._id]"
          />
          <!-- <path
            :id="`${link._key}_path`"
            class="link"
            :d="arcPath(link)"
            :style="linkStyles[link._id]"
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
          </text> -->
        </g>
      </g>

      <g class="nodes" />
    </svg>

    <div
      v-if="toggleTooltip"
      class="tooltip"
      :style="`left: ${tooltipPosition.x}px; top: ${tooltipPosition.y}px`"
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

.selected >>> .node {
  stroke-width: 6px;
  stroke: #F8CF91;
}

.labelBackground {
  opacity: .4;
  fill: rgb(255, 255, 255);
}
</style>
