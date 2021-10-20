<script lang="ts">
import {
  scaleLinear, ScaleLinear,
} from 'd3-scale';
import {
  forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY,
} from 'd3-force';

import store from '@/store';
import {
  Node, Edge, SimulationEdge,
} from '@/types';

import ContextMenu from '@/components/ContextMenu.vue';
import { applyForceToSimulation } from '@/lib/d3ForceUtils';
import {
  computed, defineComponent, getCurrentInstance, onMounted, ref, Ref,
} from '@vue/composition-api';

export default defineComponent({
  components: {
    ContextMenu,
  },

  setup() {
    const currentInstance = getCurrentInstance();

    const svg: Ref<Element | null> = ref(null);
    const straightEdges = ref(false);
    const tooltipMessage = ref('');
    const toggleTooltip = ref(false);
    const tooltipPosition = ref({ x: 0, y: 0 });
    const nestedPadding = ref(5);
    const rectSelect = ref({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      transformX: 0,
      transformY: 0,
    });

    const network = computed(() => store.state.network);
    const simulationEdges = computed(() => {
      if (network.value !== null) {
        return network.value.edges.map((edge: Edge) => {
          const newEdge: SimulationEdge = {
            ...JSON.parse(JSON.stringify(edge)),
            source: edge._from,
            target: edge._to,
          };
          return newEdge;
        });
      }
      return null;
    });
    const selectedNodes = computed(() => store.state.selectedNodes);
    const oneHop = computed(() => {
      if (network.value !== null) {
        const inNodes = network.value.edges.map((edge) => (selectedNodes.value.has(edge._to) ? edge._from : null));
        const outNodes = network.value.edges.map((edge) => (selectedNodes.value.has(edge._from) ? edge._to : null));

        const oneHopNodeIDs: Set<string | null> = new Set([...outNodes, ...inNodes]);

        // Remove null if it exists
        if (oneHopNodeIDs.has(null)) {
          oneHopNodeIDs.delete(null);
        }

        return oneHopNodeIDs;
      }
      return new Set();
    });
    const nodeColorScale = computed(() => store.getters.nodeColorScale);
    const nodeBarColorScale = computed(() => store.state.nodeBarColorScale);
    const nodeGlyphColorScale = computed(() => store.state.nodeGlyphColorScale);
    const tooltipStyle = computed(() => `left: ${tooltipPosition.value.x}px; top: ${tooltipPosition.value.y}px`);
    const fontSize = computed(() => store.state.fontSize || 0);
    const nodeTextStyle = computed(() => `font-size: ${fontSize.value}pt;`);
    const nestedVariables = computed(() => store.state.nestedVariables);
    const markerSize = computed(() => store.state.markerSize || 0);
    const nestedBarWidth = computed(() => {
      const hasGlyphs = nestedVariables.value.glyph.length !== 0;
      const totalColumns = nestedVariables.value.bar.length + (hasGlyphs ? 1 : 0);

      // Left padding + padding on right for each column
      const totalPadding = nestedPadding.value + totalColumns * nestedPadding.value;

      return (markerSize.value - totalPadding) / (totalColumns);
    });
    const nestedBarHeight = computed(() => markerSize.value - 24);
    const displayCharts = computed(() => store.state.displayCharts);
    const labelVariable = computed(() => store.state.labelVariable);
    const nodeColorVariable = computed(() => store.state.nodeColorVariable);
    const selectNeighbors = computed(() => store.state.selectNeighbors);
    const edgeVariables = computed(() => store.state.edgeVariables);
    const nodeSizeVariable = computed(() => store.state.nodeSizeVariable);
    const attributeRanges = computed(() => store.state.attributeRanges);
    const columnTypes = computed(() => store.state.columnTypes);
    const attributeScales = computed(() => {
      const scales: {[key: string]: ScaleLinear<number, number>} = {};

      if (Object.values(attributeRanges.value) !== undefined) {
        Object.values(attributeRanges.value).forEach((attr) => {
          scales[attr.attr] = scaleLinear()
            .domain([attr.min, attr.max])
            .range([0, nestedBarHeight.value]);
        });
      }
      return scales;
    });
    const edgeWidthScale = computed(() => store.getters.edgeWidthScale);
    const controlsWidth = computed(() => store.state.controlsWidth);
    const svgDimensions = computed(() => {
      const height = currentInstance !== null ? currentInstance.proxy.$vuetify.breakpoint.height : 0;
      const width = currentInstance !== null ? currentInstance.proxy.$vuetify.breakpoint.width - controlsWidth.value : 0;

      applyForceToSimulation(
        store.state.simulation,
        'x',
        forceX<Node>(width / 2),
      );
      applyForceToSimulation(
        store.state.simulation,
        'y',
        forceY<Node>(height / 2),
      );

      const dimensions = {
        height,
        width,
      };
      store.commit.setSvgDimensions(dimensions);

      // If we're in a static layout, then redraw the layout
      const xLayout = store.state.layoutVars.x !== null;
      const yLayout = store.state.layoutVars.y !== null;
      if (xLayout) {
        store.commit.applyVariableLayout({ varName: store.state.layoutVars.x || '', axis: 'x' });
      }

      if (yLayout) {
        store.commit.applyVariableLayout({ varName: store.state.layoutVars.y || '', axis: 'y' });
      }

      if (!xLayout && !yLayout) {
        store.commit.startSimulation();
      }

      return dimensions;
    });
    const directionalEdges = computed(() => store.state.directionalEdges);
    const nodeSizeScale = computed(() => store.getters.nodeSizeScale);
    const edgeColorScale = computed(() => store.getters.edgeColorScale);

    function generateNodePositions(nodes: Node[]) {
      nodes.forEach((node) => {
        // If the position is not defined for x or y, generate it
        if (node.x === undefined || node.y === undefined) {
          // eslint-disable-next-line no-param-reassign
          node.x = Math.random() * svgDimensions.value.width;
          // eslint-disable-next-line no-param-reassign
          node.y = Math.random() * svgDimensions.value.height;
        }
      });
    }

    function selectNode(node: Node) {
      if (selectedNodes.value.has(node._id)) {
        store.commit.removeSelectedNode(node._id);
      } else {
        store.commit.addSelectedNode([node._id]);
      }
    }

    function calculateNodeSize(node: Node) {
      // Don't render dynamic node size if the size variable is empty or
      // we want to display charts
      if (nodeSizeVariable.value === '' || displayCharts.value || nodeSizeScale.value === null) {
        return markerSize.value;
      }

      const calculatedValue = nodeSizeScale.value(node[nodeSizeVariable.value]);

      return calculatedValue > 40 || calculatedValue < 10 ? 0 : calculatedValue;
    }

    function dragNode(node: Node, event: MouseEvent) {
      // Only drag on left clicks
      if (event.button !== 0) {
        return;
      }

      if (!(svg.value instanceof Element)) {
        throw new Error('SVG is not of type Element');
      }

      event.stopPropagation();

      const initialX = event.x - controlsWidth.value - (calculateNodeSize(node) / 2);
      const initialY = event.y - (calculateNodeSize(node) / 2);

      const moveFn = (evt: Event) => {
        // Check we have a mouse event
        if (!(evt instanceof MouseEvent)) {
          throw new Error('event is not MouseEvent');
        }

        const eventX = evt.x - controlsWidth.value - (calculateNodeSize(node) / 2);
        const eventY = evt.y - (calculateNodeSize(node) / 2);

        if (selectedNodes.value.has(node._id)) {
          const nodeX = Math.floor(node.x || 0);
          const nodeY = Math.floor(node.y || 0);
          const dx = eventX - nodeX;
          const dy = eventY - nodeY;

          if (network.value !== null) {
            network.value.nodes
              .filter((innerNode) => selectedNodes.value.has(innerNode._id) && innerNode._id !== node._id)
              .forEach((innerNode) => {
                // eslint-disable-next-line no-param-reassign
                innerNode.x = (innerNode.x || 0) + dx;
                // eslint-disable-next-line no-param-reassign
                innerNode.y = (innerNode.y || 0) + dy;
                // eslint-disable-next-line no-param-reassign
                innerNode.fx = (innerNode.fx || innerNode.x || 0) + dx;
                // eslint-disable-next-line no-param-reassign
                innerNode.fy = (innerNode.fy || innerNode.y || 0) + dy;
              });
          }
        }

        // eslint-disable-next-line no-param-reassign
        node.x = eventX;
        // eslint-disable-next-line no-param-reassign
        node.y = eventY;
        // eslint-disable-next-line no-param-reassign
        node.fx = eventX;
        // eslint-disable-next-line no-param-reassign
        node.fy = eventY;

        if (currentInstance !== null) {
          currentInstance.proxy.$forceUpdate();
        }
      };

      const stopFn = (evt: Event) => {
        if (!(svg.value instanceof Element)) {
          throw new Error('SVG is not of type Element');
        }
        svg.value.removeEventListener('mousemove', moveFn);
        svg.value.removeEventListener('mouseup', stopFn);

        // Check we have a mouse event
        if (!(evt instanceof MouseEvent)) {
          throw new Error('event is not MouseEvent');
        }

        const finalX = evt.x - controlsWidth.value - (calculateNodeSize(node) / 2);
        const finalY = evt.y - (calculateNodeSize(node) / 2);
        const totalXMovement = Math.abs(initialX - finalX);
        const totalYMovement = Math.abs(initialY - finalY);

        if (totalXMovement < 25 && totalYMovement < 25) {
          selectNode(node);
        }
      };

      svg.value.addEventListener('mousemove', moveFn);
      svg.value.addEventListener('mouseup', stopFn);
    }

    function showTooltip(element: Node | Edge, event: MouseEvent) {
      tooltipPosition.value = {
        x: event.clientX - controlsWidth.value,
        y: event.clientY,
      };

      tooltipMessage.value = element._id;
      toggleTooltip.value = true;
    }

    function hideTooltip() {
      tooltipMessage.value = '';
      toggleTooltip.value = false;
    }

    function nodeTranslate(node: Node): string {
      let forcedX = node.x || 0;
      let forcedY = node.y || 0;

      const svgEdgePadding = 5;

      const minimumX = svgEdgePadding;
      const minimumY = svgEdgePadding;
      const maximumX = svgDimensions.value.width - calculateNodeSize(node) - svgEdgePadding;
      const maximumY = svgDimensions.value.height - calculateNodeSize(node) - svgEdgePadding;

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
    }

    function arcPath(edge: Edge): string {
      if (network.value !== null) {
        const fromNode = network.value.nodes.find((node) => node._id === edge._from);
        const toNode = network.value.nodes.find((node) => node._id === edge._to);

        if (fromNode === undefined || toNode === undefined) {
          throw new Error('Couldn\'t find the source or target for a edge, didn\'t draw arc.');
        }

        if (fromNode.x === undefined || fromNode.y === undefined || toNode.x === undefined || toNode.y === undefined) {
          throw new Error('_from or _to node didn\'t have an x or a y position.');
        }

        const x1 = fromNode.x + calculateNodeSize(fromNode) / 2;
        const y1 = fromNode.y + calculateNodeSize(fromNode) / 2;
        const x2 = toNode.x + calculateNodeSize(toNode) / 2;
        const y2 = toNode.y + calculateNodeSize(toNode) / 2;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dr = Math.sqrt(dx * dx + dy * dy);
        const sweep = 1;
        const xRotation = 0;
        const largeArc = 0;

        if (straightEdges.value) {
          return (`M ${x1} ${y1} L ${x2} ${y2}`);
        }
        return (`M ${x1}, ${y1} A ${dr}, ${dr} ${xRotation}, ${largeArc}, ${sweep} ${x2},${y2}`);
      }
      return '';
    }

    function isSelected(nodeID: string): boolean {
      return selectedNodes.value.has(nodeID);
    }

    function nodeGroupClass(node: Node): string {
      if (selectedNodes.value.size > 0) {
        const selected = isSelected(node._id);
        const inOneHop = selectNeighbors.value ? oneHop.value.has(node._id) : false;
        const selectedClass = selected || inOneHop ? '' : 'muted';
        return `nodeGroup ${selectedClass}`;
      }
      return 'nodeGroup';
    }

    function nodeClass(node: Node): string {
      const selected = isSelected(node._id);
      const selectedClass = selected ? 'selected' : '';

      return `node nodeBox ${selectedClass}`;
    }

    function nodeFill(node: Node) {
      const calculatedValue = node[nodeColorVariable.value];
      const useCalculatedValue = !displayCharts.value && columnTypes.value !== null
      && (
        // Numeric check
        (
          columnTypes.value[nodeColorVariable.value] === 'number'
          && !(calculatedValue < nodeColorScale.value.domain()[0] || calculatedValue > nodeColorScale.value.domain()[1])
          && nodeColorVariable.value !== ''
        )
        // Categorical check
        || (
          columnTypes.value[nodeColorVariable.value] !== 'number'
          && attributeRanges.value[nodeColorVariable.value]
          && (attributeRanges.value[nodeColorVariable.value].currentBinLabels || attributeRanges.value[nodeColorVariable.value].binLabels)
            .find((label) => label.toString() === calculatedValue.toString())
        )
      );

      return useCalculatedValue ? nodeColorScale.value(calculatedValue) : '#EEEEEE';
    }

    function edgeGroupClass(edge: Edge): string {
      if (selectedNodes.value.size > 0) {
        const selected = isSelected(edge._from) || isSelected(edge._to);
        const selectedClass = selected && selectNeighbors.value ? '' : 'muted';
        return `edgeGroup ${selectedClass}`;
      }
      return 'edgeGroup';
    }

    function edgeStyle(edge: Edge): string {
      const edgeWidth = edgeVariables.value.width === '' ? 1 : edgeWidthScale.value(edge[edgeVariables.value.width]);

      const calculatedColorValue = edge[edgeVariables.value.color];
      const useCalculatedColorValue = edgeVariables.value.color !== '' && columnTypes.value !== null
      && (
        // Numeric check
        (
          columnTypes.value[edgeVariables.value.color] === 'number'
          && !(calculatedColorValue < edgeColorScale.value.domain()[0] || calculatedColorValue > edgeColorScale.value.domain()[1])
        )
        // Categorical check
        || (
          columnTypes.value[edgeVariables.value.color] !== 'number'
          && attributeRanges.value[edgeVariables.value.color]
          && (attributeRanges.value[edgeVariables.value.color].currentBinLabels || attributeRanges.value[edgeVariables.value.color].binLabels)
            .find((label) => label.toString() === calculatedColorValue.toString())
        )
      );

      return `
        stroke: ${useCalculatedColorValue ? edgeColorScale.value(calculatedColorValue) : '#888888'};
        stroke-width: ${(edgeWidth > 20 || edgeWidth < 1) ? 0 : edgeWidth}px;
        opacity: 0.7;
      `;
    }

    function glyphFill(node: Node, glyphVar: string) {
      // Figure out what values should be mapped to colors
      const possibleValues = [
        ...(attributeRanges.value[nestedVariables.value.glyph[0]].currentBinLabels || attributeRanges.value[nestedVariables.value.glyph[0]].binLabels),
      ];
      if (nestedVariables.value.glyph[1]) {
        possibleValues.push(...(attributeRanges.value[nestedVariables.value.glyph[1]].currentBinLabels || attributeRanges.value[nestedVariables.value.glyph[1]].binLabels));
      }
      const scaleContainsValue = possibleValues.find((domainElement) => domainElement === node[glyphVar]);

      // If outside the doamin, return black
      return scaleContainsValue ? nodeGlyphColorScale.value(node[glyphVar]) : '#000000';
    }

    function rectSelectDrag(event: MouseEvent) {
      // Only drag on left clicks
      if (event.button !== 0) {
        return;
      }

      // Set initial location for box (pins one corner)
      rectSelect.value = {
        x: event.x - controlsWidth.value,
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
        const mouseX = evt.x - controlsWidth.value;
        const mouseY = evt.y;

        // Check if we need to translate (case when mouse is left/above initial click)
        const translateX = mouseX < rectSelect.value.x;
        const translateY = mouseY < rectSelect.value.y;

        // Set the parameters
        rectSelect.value = {
          x: rectSelect.value.x,
          y: rectSelect.value.y,
          width: Math.abs(rectSelect.value.x - mouseX),
          height: Math.abs(rectSelect.value.y - mouseY),
          transformX: translateX ? -Math.abs(rectSelect.value.x - mouseX) : 0,
          transformY: translateY ? -Math.abs(rectSelect.value.y - mouseY) : 0,
        };
      };

      const stopFn = () => {
        const boxX1 = Math.min(rectSelect.value.x + rectSelect.value.transformX, rectSelect.value.x);
        const boxX2 = boxX1 + rectSelect.value.width;
        const boxY1 = Math.min(rectSelect.value.y + rectSelect.value.transformY, rectSelect.value.y);
        const boxY2 = boxY1 + rectSelect.value.height;

        // Find which nodes are in the box
        let nodesInRect: Node[] = [];
        if (network.value !== null) {
          nodesInRect = network.value.nodes.filter((node) => {
            const nodeSize = calculateNodeSize(node) / 2;
            return (node.x || 0) + nodeSize > boxX1
              && (node.x || 0) + nodeSize < boxX2
              && (node.y || 0) + nodeSize > boxY1
              && (node.y || 0) + nodeSize < boxY2;
          });
        }

        // Select the nodes inside the box if there are any
        store.commit.addSelectedNode(nodesInRect.map((node) => node._id));

        // Remove the listeners so that the box stops updating location
        if (!(svg.value instanceof Element)) {
          throw new Error('SVG is not of type Element');
        }
        svg.value.removeEventListener('mousemove', moveFn);
        svg.value.removeEventListener('mouseup', stopFn);

        // Remove the selection box
        rectSelect.value = {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          transformX: 0,
          transformY: 0,
        };
      };

      if (!(svg.value instanceof Element)) {
        throw new Error('SVG is not of type Element');
      }
      svg.value.addEventListener('mousemove', moveFn);
      svg.value.addEventListener('mouseup', stopFn);
    }

    function showContextMenu(event: MouseEvent) {
      store.commit.updateRightClickMenu({
        show: true,
        top: event.y,
        left: event.x,
      });

      event.preventDefault();
    }

    if (network.value !== null) {
      generateNodePositions(network.value.nodes);
    }

    onMounted(() => {
      if (network.value !== null && simulationEdges.value !== null) {
      // Make the simulation
        const simulation = forceSimulation<Node, SimulationEdge>(network.value.nodes)
          .force('edge', forceLink<Node, SimulationEdge>(simulationEdges.value).id((d) => { const datum = (d as Edge); return datum._id; }).strength(0.5))
          .force('x', forceX(svgDimensions.value.width / 2))
          .force('y', forceY(svgDimensions.value.height / 2))
          .force('charge', forceManyBody<Node>().strength(-100))
          .force('collision', forceCollide((markerSize.value / 2) * 1.5))
          .on('tick', () => {
            if (currentInstance !== null) {
              currentInstance.proxy.$forceUpdate();
            }
          })
        // The next line handles the start stop button change in the controls.
        // It's not explicitly necessary for the simulation to work
          .on('end', () => {
            store.commit.stopSimulation();
          });

        store.commit.setSimulation(simulation);
        store.commit.startSimulation();
      }
    });

    return {
      svg,
      svgDimensions,
      rectSelect,
      network,
      edgeGroupClass,
      edgeStyle,
      arcPath,
      directionalEdges,
      nodeGroupClass,
      nodeTranslate,
      nodeClass,
      rectSelectDrag,
      showContextMenu,
      calculateNodeSize,
      nodeFill,
      toggleTooltip,
      displayCharts,
      showTooltip,
      hideTooltip,
      nodeTextStyle,
      labelVariable,
      tooltipStyle,
      tooltipMessage,
      dragNode,
      nestedVariables,
      attributeScales,
      nestedBarWidth,
      nestedBarHeight,
      nestedPadding,
      nodeBarColorScale,
      glyphFill,
    };
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
        class="edges"
        fill="none"
        alpha="0.8"
      >
        <g
          v-for="edge of network.edges"
          :key="edge._id"
          :class="edgeGroupClass(edge)"
          @mouseover="showTooltip(edge, $event)"
          @mouseout="hideTooltip"
        >
          <path
            :id="`${edge._key}_path`"
            class="edge"
            :d="arcPath(edge)"
            :style="edgeStyle(edge)"
          />

          <text
            v-if="directionalEdges"
            dominant-baseline="middle"
            y="1"
          >
            <textPath
              :href="`#${edge._key}_path`"
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
            :fill="nodeFill(node)"
            :rx="!displayCharts ? (calculateNodeSize(node) / 2) : 0"
            :ry="!displayCharts ? (calculateNodeSize(node) / 2) : 0"
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
              :height="nestedBarHeight / 2 - 1"
              :y="20 + (i * ((nestedBarHeight / 2) + 1))"
              :x="((nestedBarWidth + nestedPadding) * nestedVariables.bar.length) + nestedPadding"
              :fill="glyphFill(node, glyphVar)"
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

.node {
  stroke-width: 1px;
  stroke: #9E9E9E;
}

.node.selected {
  stroke-width: 6px;
  stroke: #F8CF91;
}

.labelBackground {
  fill: #E0E0E0;
  stroke-width: 1px;
  stroke: #9E9E9E;
}
</style>
