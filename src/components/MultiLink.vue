<script setup lang="ts">
import {
  scaleBand, scaleLinear, ScaleLinear,
  forceLink, forceManyBody, forceSimulation, forceX, forceY,
  select, axisBottom, axisLeft,
} from 'd3';
import {
  computed, onMounted, ref, watch,
} from 'vue';
import { ColumnType } from 'multinet';
import { useStore } from '@/store';
import {
  Node, Edge, SimulationEdge, AttributeRange,
} from '@/types';
import ContextMenu from '@/components/ContextMenu.vue';
import { applyForceToSimulation } from '@/lib/d3ForceUtils';
import { isInternalField } from '@/lib/typeUtils';
import { storeToRefs } from 'pinia';
import { useMouseInElement, useWindowSize } from '@vueuse/core';

const props = defineProps<{ showControlPanel: boolean }>();

const store = useStore();
const {
  network,
  selectedNodes,
  nodeBarColorScale,
  nestedVariables,
  markerSize,
  displayCharts,
  labelVariable,
  selectNeighbors,
  attributeRanges,
  columnTypes,
  directionalEdges,
  layoutVars,
  nodeSizeVariable,
  nodeColorVariable,
  edgeVariables,
  nodeGlyphColorScale,
  simulation,
  edgeColorScale,
  nodeSizeScale,
  nodeColorScale,
  edgeWidthScale,
} = storeToRefs(store);

// Commonly used variables
const multiLinkSvg = ref<HTMLElement | null>(null);
const { elementX: relativeX, elementY: relativeY } = useMouseInElement(multiLinkSvg);
const nodeTextStyle = computed(() => `font-size: ${store.fontSize || 0}pt;`);

const nestedPadding = ref(5);
const nestedBarWidth = computed(() => {
  const hasGlyphs = nestedVariables.value.glyph.length !== 0;
  const totalColumns = nestedVariables.value.bar.length + (hasGlyphs ? 1 : 0);

  // Left padding + padding on right for each column
  const totalPadding = nestedPadding.value + totalColumns * nestedPadding.value;

  return (markerSize.value - totalPadding) / (totalColumns);
});
const nestedBarHeight = computed(() => markerSize.value - 24);
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
const clipRegionSize = 100;

// Update height and width as the window size changes
// Also update center attraction forces as the size changes
const { height: pageHeight, width: pageWidth } = useWindowSize();
const toolbarHeight = 48;
const svgDimensions = computed(() => {
  const height = pageHeight.value - toolbarHeight;
  const width = pageWidth.value - (props.showControlPanel ? 256 : 0);

  applyForceToSimulation(
    store.simulation,
    'x',
    forceX<Node>(width / 2),
  );
  applyForceToSimulation(
    store.simulation,
    'y',
    forceY<Node>(height / 2),
  );

  const dimensions = {
    height,
    width,
  };
  // eslint-disable-next-line vue/no-side-effects-in-computed-properties
  store.svgDimensions = dimensions;

  return dimensions;
});
watch([svgDimensions], () => {
  // If we're in a static layout, then redraw the layout
  const xLayout = layoutVars.value.x !== null;
  const yLayout = layoutVars.value.y !== null;
  if (xLayout) {
    store.applyVariableLayout({ varName: layoutVars.value.x || '', axis: 'x' });
  }

  if (yLayout) {
    store.applyVariableLayout({ varName: layoutVars.value.y || '', axis: 'y' });
  }

  if (!xLayout && !yLayout) {
    store.startSimulation();
  }
});

function selectNode(node: Node) {
  if (selectedNodes.value.includes(node._id)) {
    selectedNodes.value = selectedNodes.value.filter((inside) => inside !== node._id);
  } else {
    selectedNodes.value.push(node._id);
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

  if (!(multiLinkSvg.value instanceof Element)) {
    throw new Error('multiLinkSvg is not of type Element');
  }

  event.stopPropagation();

  const initialX = relativeX.value;
  const initialY = relativeY.value;

  const moveFn = (evt: Event) => {
    // Check we have a mouse event
    if (!(evt instanceof MouseEvent)) {
      throw new Error('event is not MouseEvent');
    }

    const eventX = relativeX.value;
    const eventY = relativeY.value;

    if (selectedNodes.value.includes(node._id)) {
      const nodeX = Math.floor(node.x || 0);
      const nodeY = Math.floor(node.y || 0);
      const dx = eventX - nodeX;
      const dy = eventY - nodeY;

      network.value.nodes
        .filter((innerNode) => selectedNodes.value.includes(innerNode._id) && innerNode._id !== node._id)
        .forEach((innerNode) => {
          innerNode.x = (innerNode.x || 0) + dx;
          innerNode.y = (innerNode.y || 0) + dy;
          innerNode.fx = (innerNode.fx || innerNode.x || 0) + dx;
          innerNode.fy = (innerNode.fy || innerNode.y || 0) + dy;
        });
    }

    node.x = eventX;
    node.y = eventY;
    node.fx = eventX;
    node.fy = eventY;
  };

  const stopFn = (evt: Event) => {
    if (!(multiLinkSvg.value instanceof Element)) {
      throw new Error('multiLinkSvg is not of type Element');
    }
    multiLinkSvg.value.removeEventListener('mousemove', moveFn);
    multiLinkSvg.value.removeEventListener('mouseup', stopFn);

    // Check we have a mouse event
    if (!(evt instanceof MouseEvent)) {
      throw new Error('event is not MouseEvent');
    }

    const finalX = relativeX.value;
    const finalY = relativeY.value;
    const totalXMovement = Math.abs(initialX - finalX);
    const totalYMovement = Math.abs(initialY - finalY);

    if (totalXMovement < 25 && totalYMovement < 25) {
      selectNode(node);
    }
  };

  multiLinkSvg.value.addEventListener('mousemove', moveFn);
  multiLinkSvg.value.addEventListener('mouseup', stopFn);
}

const tooltipMessage = ref('');
const toggleTooltip = ref(false);
const tooltipPosition = ref({ x: 0, y: 0 });
const tooltipStyle = computed(() => `left: ${tooltipPosition.value.x}px; top: ${tooltipPosition.value.y}px; white-space: pre-line;`);
function showTooltip(element: Node | Edge) {
  tooltipPosition.value = {
    x: relativeX.value + 10,
    y: relativeY.value + toolbarHeight + 10,
  };

  tooltipMessage.value = Object.entries(element)
    .filter(([key]) => !isInternalField(key))
    .map(([key, value]) => `${key}: ${value}`).reduce((a, b) => `${a}\n${b}`);
  toggleTooltip.value = true;
}

function hideTooltip() {
  tooltipMessage.value = '';
  toggleTooltip.value = false;
}

function arcPath(edge: Edge): string {
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

  return (`M ${x1}, ${y1} A ${dr}, ${dr} ${xRotation}, ${largeArc}, ${sweep} ${x2},${y2}`);
}

function isSelected(nodeID: string): boolean {
  return selectedNodes.value.includes(nodeID);
}

const oneHop = computed(() => {
  const inNodes = network.value.edges.map((edge) => (selectedNodes.value.includes(edge._to) ? edge._from : null));
  const outNodes = network.value.edges.map((edge) => (selectedNodes.value.includes(edge._from) ? edge._to : null));

  const oneHopNodeIDs: Set<string | null> = new Set([...outNodes, ...inNodes]);

  // Remove null if it exists
  if (oneHopNodeIDs.has(null)) {
    oneHopNodeIDs.delete(null);
  }

  return oneHopNodeIDs;
});
function nodeGroupClass(node: Node): string {
  if (selectedNodes.value.length > 0) {
    const selected = isSelected(node._id);
    const inOneHop = selectNeighbors.value ? oneHop.value.has(node._id) : false;
    const selectedClass = selected || inOneHop || !selectNeighbors.value ? '' : 'muted';
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
  if (selectedNodes.value.length > 0) {
    const selected = isSelected(edge._from) || isSelected(edge._to);
    const selectedClass = selected || !selectNeighbors.value ? '' : 'muted';
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

const rectSelect = ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  transformX: 0,
  transformY: 0,
});
function rectSelectDrag(event: MouseEvent) {
  // Only drag on left clicks
  if (event.button !== 0) {
    return;
  }

  // Set initial location for box (pins one corner)
  rectSelect.value = {
    x: relativeX.value,
    y: relativeY.value,
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
    const mouseX = relativeX.value;
    const mouseY = relativeY.value;

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

    // If x1 == x2 && y1 == y2, it was a click so deselect
    if (boxX1 === boxX2 && boxY1 === boxY2) {
      selectedNodes.value = [];
    }

    // Find which nodes are in the box
    let nodesInRect: Node[] = [];
    nodesInRect = network.value.nodes.filter((node) => {
      const nodeSize = calculateNodeSize(node) / 2;
      return (node.x || 0) + nodeSize > boxX1
            && (node.x || 0) + nodeSize < boxX2
            && (node.y || 0) + nodeSize > boxY1
            && (node.y || 0) + nodeSize < boxY2;
    });

    // Select the nodes inside the box if there are any
    nodesInRect.forEach((node) => selectedNodes.value.push(node._id));

    // Remove the listeners so that the box stops updating location
    if (!(multiLinkSvg.value instanceof Element)) {
      throw new Error('multiLinkSvg is not of type Element');
    }
    multiLinkSvg.value.removeEventListener('mousemove', moveFn);
    multiLinkSvg.value.removeEventListener('mouseup', stopFn);

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

  if (!(multiLinkSvg.value instanceof Element)) {
    throw new Error('multiLinkSvg is not of type Element');
  }
  multiLinkSvg.value.addEventListener('mousemove', moveFn);
  multiLinkSvg.value.addEventListener('mouseup', stopFn);
}

function showContextMenu(event: MouseEvent) {
  store.rightClickMenu = {
    show: true,
    top: event.y,
    left: event.x,
  };

  event.preventDefault();
}

const simulationEdges = computed(() => network.value.edges.map((edge: Edge) => {
  const newEdge: SimulationEdge = {
    ...structuredClone(edge),
    source: edge._from,
    target: edge._to,
  };
  return newEdge;
}));
watch(attributeRanges, () => {
  if (simulationEdges.value !== null && layoutVars.value.x === null && layoutVars.value.y === null) {
    const simEdges = simulationEdges.value.filter((edge: Edge) => {
      if (edgeVariables.value.width !== '') {
        const widthValue = edgeWidthScale.value(edge[edgeVariables.value.width]);
        return widthValue < 20 && widthValue > 1;
      }
      return true;
    });

    applyForceToSimulation(
      simulation.value,
      'edge',
      forceLink<Node, SimulationEdge>(simEdges).id((d) => d._id),
    );
  }
});

function resetSimulationForces() {
  // Reset forces before applying (if there are layout vars)
  if (simulationEdges.value !== null) {
    // Double force to the middle of each axis if there's a layout var. Causes the nodes to be pulled to the middle.
    applyForceToSimulation(
      simulation.value,
      'x',
      forceX(svgDimensions.value.width / 2),
    );
    applyForceToSimulation(
      simulation.value,
      'y',
      forceY(svgDimensions.value.height / 2),
    );
    applyForceToSimulation(
      simulation.value,
      'edge',
      forceLink<Node, SimulationEdge>(simulationEdges.value).id((d) => d._id),
    );
    applyForceToSimulation(
      simulation.value,
      'charge',
      forceManyBody().strength(-120),
    );
  }
}

const xAxisPadding = 60;
const yAxisPadding = 80;
function makePositionScale(axis: 'x' | 'y', type: ColumnType, range: AttributeRange) {
  const varName = layoutVars.value[axis];
  let clipLow = false;
  let clipHigh = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let positionScale: any;

  if (type === 'number') {
    let minValue = range.min;
    let maxValue = range.max - 1; // subtract 1, because of the + 1 on the legend chart scale

    // Check IQR for outliers
    if (varName !== null) {
      const values = network.value.nodes.map((node) => node[varName]).sort((a, b) => a - b);

      let q1;
      let q3;
      if ((values.length / 4) % 1 === 0) {
        q1 = 0.5 * (values[(values.length / 4)] + values[(values.length / 4) + 1]);
        q3 = 0.5 * (values[(values.length * (3 / 4))] + values[(values.length * (3 / 4)) + 1]);
      } else {
        q1 = values[Math.floor(values.length / 4 + 1)];
        q3 = values[Math.ceil(values.length * (3 / 4) + 1)];
      }

      const iqr = q3 - q1;
      const maxCandidate = q3 + iqr * 1.5;
      const minCandidate = q1 - iqr * 1.5;

      if (maxCandidate < maxValue) {
        maxValue = maxCandidate;
        clipHigh = true;
        select(`#${axis}-high-clip`).style('visibility', 'visible');
        select(`#${axis}-high-clip > text`).text(`> ${maxCandidate}`);
      }

      if (minCandidate > minValue) {
        minValue = minCandidate;
        clipLow = true;
        select(`#${axis}-low-clip`).style('visibility', 'visible');
        select(`#${axis}-low-clip > text`).text(`< ${minCandidate}`);
      }
    }

    positionScale = scaleLinear()
      .domain([minValue, maxValue]);
  } else {
    positionScale = scaleBand()
      .domain(range.binLabels);
  }

  if (axis === 'x') {
    const minMax = [clipLow ? yAxisPadding + clipRegionSize : yAxisPadding, clipHigh ? svgDimensions.value.width - clipRegionSize : svgDimensions.value.width];
    positionScale = positionScale
      .range(minMax);
  } else {
    const minMax = [clipLow ? svgDimensions.value.height - xAxisPadding - clipRegionSize : svgDimensions.value.height - xAxisPadding, clipHigh ? clipRegionSize : 0];
    positionScale = positionScale
      .range(minMax);
  }

  const otherAxis = axis === 'x' ? 'y' : 'x';

  if (varName !== null) {
    if (columnTypes.value !== null) {
      const otherAxisPadding = axis === 'x' ? 80 : 60;

      if (type === 'number') {
        const scaleDomain = positionScale.domain();
        const scaleRange = positionScale.range();
        network.value.nodes.forEach((node) => {
          const nodeVal = node[varName];
          let position = positionScale(nodeVal);

          if (axis === 'x') {
            position = nodeVal > scaleDomain[1] ? scaleRange[1] + ((clipRegionSize - 10) * ((nodeVal - scaleDomain[1]) / (range.max - scaleDomain[1]))) : position;
            position = nodeVal < scaleDomain[0] ? scaleRange[0] - ((clipRegionSize - 10) * ((scaleDomain[0] - nodeVal) / (scaleDomain[0] - range.min))) : position;
          } else {
            position = nodeVal > scaleDomain[1] ? scaleRange[1] - ((clipRegionSize - 10) * ((nodeVal - scaleDomain[1]) / (range.max - scaleDomain[1]))) : position;
            position = nodeVal < scaleDomain[0] ? scaleRange[0] + ((clipRegionSize - 10) * ((scaleDomain[0] - nodeVal) / (scaleDomain[0] - range.min))) : position;
          }
          position -= (markerSize.value / 2);

          node[axis] = position;
          node[`f${axis}`] = position;

          if (layoutVars.value[otherAxis] === null) {
            node[`f${otherAxis}`] = undefined;
          }
        });
      } else {
        let positionOffset: number;

        if (axis === 'x') {
          positionOffset = (svgDimensions.value.width - otherAxisPadding) / ((range.binLabels.length) * 2);
        } else {
          positionOffset = ((svgDimensions.value.height - xAxisPadding) / ((range.binLabels.length) * 2)) - 10;
        }

        const force = axis === 'x' ? forceX<Node>((d) => positionScale(d[varName]) + positionOffset).strength(1) : forceY<Node>((d) => positionScale(d[varName]) + positionOffset).strength(1);
        applyForceToSimulation(
          simulation.value,
          axis,
          force,
        );

        // Disable edge forces
        applyForceToSimulation(
          simulation.value,
          'edge',
          forceLink<Node, SimulationEdge>().strength(0),
        );
      }
    }
  } else if (layoutVars.value[otherAxis] === null) {
    store.releaseNodes();
  }

  store.startSimulation();
  return positionScale;
}

function resetAxesClipRegions() {
  select('#axes').selectAll('g').remove();

  select('#x-low-clip').style('visibility', 'hidden');
  select('#x-high-clip').style('visibility', 'hidden');
  select('#y-low-clip').style('visibility', 'hidden');
  select('#y-high-clip').style('visibility', 'hidden');
}

watch(layoutVars, () => {
  resetAxesClipRegions();
  resetSimulationForces();

  // Add x layout
  if (columnTypes.value !== null && layoutVars.value.x !== null) {
    const type = columnTypes.value[layoutVars.value.x];
    const range = attributeRanges.value[layoutVars.value.x];

    const positionScale = makePositionScale('x', type, range);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const xAxis = axisBottom(positionScale as any);
    const axisGroup = select('#axes')
      .append('g');

    // Add the axis
    axisGroup
      .attr('transform', `translate(0, ${svgDimensions.value.height - xAxisPadding})`)
      .call(xAxis);

    // Add the axis label
    const labelGroup = axisGroup
      .append('g');

    const label = labelGroup
      .append('text')
      .text(layoutVars.value.x)
      .attr('fill', 'currentColor')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('x', ((svgDimensions.value.width - yAxisPadding) / 2) + yAxisPadding)
      .attr('y', xAxisPadding - 20);

    const labelRectPos = (label.node() as SVGTextElement).getBBox();
    labelGroup
      .insert('rect', 'text')
      .attr('x', labelRectPos.x)
      .attr('y', labelRectPos.y)
      .attr('width', labelRectPos.width)
      .attr('height', labelRectPos.height)
      .attr('fill', 'white');
  }

  // Add y layout
  if (columnTypes.value !== null && layoutVars.value.y !== null) {
    const type = columnTypes.value[layoutVars.value.y];
    const range = attributeRanges.value[layoutVars.value.y];

    const positionScale = makePositionScale('y', type, range);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yAxis = axisLeft(positionScale as any);
    const axisGroup = select('#axes')
      .append('g');

    // Add the axis
    axisGroup
      .attr('transform', `translate(${yAxisPadding}, 0)`)
      .call(yAxis);

    // Add the axis label
    const labelGroup = axisGroup
      .append('g')
      .attr('transform', 'rotate(90)');

    const label = labelGroup
      .append('text')
      .text(layoutVars.value.y)
      .attr('fill', 'currentColor')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .attr('x', ((svgDimensions.value.height - xAxisPadding - 10) / 2) + 10)
      .attr('y', yAxisPadding - 20);

    const labelRectPos = (label.node() as SVGTextElement).getBBox();
    labelGroup
      .insert('rect', 'text')
      .attr('x', labelRectPos.x)
      .attr('y', labelRectPos.y)
      .attr('width', labelRectPos.width)
      .attr('height', labelRectPos.height)
      .attr('fill', 'white');
  }
});

const svgEdgePadding = 5;

const minimumX = svgEdgePadding;
const minimumY = svgEdgePadding;
const maximumX = computed(() => svgDimensions.value.width - svgEdgePadding);
const maximumY = svgDimensions.value.height - svgEdgePadding;
onMounted(() => {
  if (simulationEdges.value !== null) {
    // Make the simulation
    simulation.value = forceSimulation<Node, SimulationEdge>(network.value.nodes)
      .on('tick', () => {
        network.value?.nodes.forEach((node) => {
          if (node.x !== undefined && node.y !== undefined) {
            const maxX = maximumX.value - calculateNodeSize(node);
            const maxY = maximumY - calculateNodeSize(node);

            // Update the node position forced to stay on the svg
            if (node.x < minimumX) { node.x = minimumX; }
            if (node.x > maxX) { node.x = maxX; }
            if (node.fx > maxX) { node.fx = maxX; }
            if (node.y < minimumY) { node.y = minimumY; }
            if (node.y > maxY) { node.y = maxY; }
          }
        });
      })
    // The next line handles the start stop button change in the controls.
    // It's not explicitly necessary for the simulation to work
      .on('end', () => {
        store.stopSimulation();
      });

    resetSimulationForces(); // Initialize simulation forces
    store.startSimulation();
    resetAxesClipRegions();
  }
});
</script>

<template>
  <div>
    <svg
      ref="multiLinkSvg"
      :width="svgDimensions.width"
      :height="svgDimensions.height"
      :style="`margin-left: ${props.showControlPanel ? 256 : 0}px`"
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

      <g id="axes" />

      <!-- High and low clip regions -->
      <g>
        <g
          id="x-low-clip"
        >
          <rect
            class="clip-region"
            :x="xAxisPadding + 20"
            y="0"
            :height="svgDimensions.height"
            :width="clipRegionSize"
          />
          <text
            :x="xAxisPadding + 20 + (clipRegionSize / 2)"
            :y="svgDimensions.height - yAxisPadding + 50"
            dominant-baseline="hanging"
            text-anchor="middle"
          >low values
          </text>
        </g>

        <g
          id="x-high-clip"
        >
          <rect
            class="clip-region"
            :x="svgDimensions.width - clipRegionSize"
            y="0"
            :height="svgDimensions.height"
            :width="clipRegionSize"
          />
          <text
            :x="svgDimensions.width - (clipRegionSize / 2)"
            :y="svgDimensions.height - yAxisPadding + 50"
            dominant-baseline="hanging"
            text-anchor="middle"
          >high values
          </text>
        </g>

        <g
          id="y-low-clip"
        >
          <rect
            class="clip-region"
            x="0"
            :y="svgDimensions.height - yAxisPadding + 20 - clipRegionSize"
            :height="clipRegionSize"
            :width="svgDimensions.width"
          />
          <text
            :x="xAxisPadding + 20"
            :y="svgDimensions.height - yAxisPadding + 20 - (clipRegionSize / 2)"
            dominant-baseline="middle"
            text-anchor="end"
          >low values
          </text>
        </g>

        <g
          id="y-high-clip"
        >
          <rect
            class="clip-region"
            x="0"
            y="0"
            :height="clipRegionSize"
            :width="svgDimensions.width"
          />
          <text
            :x="xAxisPadding + 20"
            :y="clipRegionSize / 2"
            dominant-baseline="middle"
            text-anchor="end"
          >high values
          </text>
        </g>
      </g>

      <g
        class="edges"
        fill="none"
        alpha="0.8"
      >
        <g
          v-for="edge of network.edges"
          :key="edge._id"
          :class="edgeGroupClass(edge)"
          @mouseover="showTooltip(edge)"
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
          :transform="`translate(${node.x},${node.y})`"
          :class="nodeGroupClass(node)"
        >
          <rect
            :class="nodeClass(node)"
            :width="calculateNodeSize(node)"
            :height="calculateNodeSize(node)"
            :fill="nodeFill(node)"
            :rx="!displayCharts ? (calculateNodeSize(node) / 2) : 0"
            :ry="!displayCharts ? (calculateNodeSize(node) / 2) : 0"
            @mouseover="showTooltip(node)"
            @mouseout="hideTooltip"
            @mousedown="dragNode(node, $event)"
          />
          <text
            class="label"
            dominant-baseline="middle"
            fill="#3a3a3a"
            text-anchor="middle"
            :dy="!displayCharts ? calculateNodeSize(node) / 2 : 10"
            :dx="calculateNodeSize(node) / 2"
            :style="nodeTextStyle"
          >{{ labelVariable === null ? '' : node[labelVariable] }}</text>

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
      {{ tooltipMessage }}
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

.clip-region {
  fill: #000000;
  opacity: 0.2;
}
</style>
