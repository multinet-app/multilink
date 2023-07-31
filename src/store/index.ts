import { defineStore, storeToRefs } from 'pinia';
import {
  Simulation, scaleLinear, scaleOrdinal, scaleSequential, interpolateBlues, interpolateReds, schemeCategory10,
} from 'd3';
import {
  ColumnTypes, NetworkSpec, Table, UserSpec,
} from 'multinet';
import api from '@/api';
import {
  Edge, Node, NestedVariables, AttributeRanges, LoadError, Network, SimulationEdge, AttributeRange,
} from '@/types';
import { applyForceToSimulation } from '@/lib/d3ForceUtils';
import oauthClient from '@/oauth';
import { computed, ref, watch } from 'vue';
import { useProvenanceStore } from '@/store/provenance';
import { useWindowSize } from '@vueuse/core';

export const useStore = defineStore('store', () => {
  // Provenance
  const provStore = useProvenanceStore();
  const { provenance } = provStore;
  const {
    selectNeighbors,
    displayCharts,
    directionalEdges,
    selectedNodes,
    nestedVariables,
    labelVariable,
    edgeVariables,
    nodeSizeVariable,
    nodeColorVariable,
    layoutVars,
    markerSize,
    fontSize,
    edgeLength,
    workspaceName,
    networkName,
  } = storeToRefs(provStore);

  const network = ref<Network>({ nodes: [], edges: [] });
  const columnTypes = ref<ColumnTypes>({});
  const loadError = ref<LoadError>({
    message: '',
    href: '',
  });
  const simulation = ref<Simulation<Node, SimulationEdge> | null>(null);
  const attributeRanges = ref<AttributeRanges>({});
  const nodeBarColorScale = ref(scaleOrdinal(schemeCategory10));
  const nodeGlyphColorScale = ref(scaleOrdinal(schemeCategory10));
  const simulationRunning = ref(false);
  const showProvenanceVis = ref(false);
  const rightClickMenu = ref({
    show: false,
    top: 0,
    left: 0,
  });
  const userInfo = ref<UserSpec | null>(null);
  const svgDimensions = ref({
    height: 0,
    width: 0,
  });
  const networkTables = ref<Table[]>([]);
  const snackBarMessage = ref('');

  const nodeTableNames = computed(() => networkTables.value.filter((table) => !table.edge).map((table) => table.name));
  const edgeTableName = computed(() => {
    const edgeTable = networkTables.value.find((table) => table.edge);

    return edgeTable !== undefined ? edgeTable.name : undefined;
  });

  const nodeColorScale = computed(() => {
    if (
      attributeRanges.value !== null
      && Object.keys(attributeRanges.value).length > 0
      && Object.keys(attributeRanges.value).includes(nodeColorVariable.value)
      && columnTypes.value[nodeColorVariable.value] === 'number'
    ) {
      const minValue = attributeRanges.value[nodeColorVariable.value].currentMin || attributeRanges.value[nodeColorVariable.value].min;
      const maxValue = attributeRanges.value[nodeColorVariable.value].currentMax || attributeRanges.value[nodeColorVariable.value].max;

      return scaleSequential(interpolateBlues).domain([minValue, maxValue]);
    }

    return nodeGlyphColorScale.value;
  });

  const edgeColorScale = computed(() => {
    if (
      attributeRanges.value !== null
      && Object.keys(attributeRanges.value).length > 0
      && Object.keys(attributeRanges.value).includes(edgeVariables.value.color)
      && columnTypes.value[edgeVariables.value.color] === 'number'
    ) {
      const minValue = attributeRanges.value[edgeVariables.value.color].currentMin || attributeRanges.value[edgeVariables.value.color].min;
      const maxValue = attributeRanges.value[edgeVariables.value.color].currentMax || attributeRanges.value[edgeVariables.value.color].max;

      return scaleSequential(interpolateReds)
        .domain([minValue, maxValue]);
    }

    return nodeGlyphColorScale.value;
  });

  const nodeSizeScale = computed(() => {
    if (
      attributeRanges.value !== null
      && Object.keys(attributeRanges.value).length > 0
      && Object.keys(attributeRanges.value).includes(nodeSizeVariable.value)
      && columnTypes.value[nodeSizeVariable.value]
    ) {
      const minValue = attributeRanges.value[nodeSizeVariable.value].currentMin || attributeRanges.value[nodeSizeVariable.value].min;
      const maxValue = attributeRanges.value[nodeSizeVariable.value].currentMax || attributeRanges.value[nodeSizeVariable.value].max;

      return scaleLinear()
        .domain([minValue, maxValue])
        .range([10, 40]);
    }
    return scaleLinear();
  });

  const edgeWidthScale = computed(() => {
    if (
      attributeRanges.value !== null
      && Object.keys(attributeRanges.value).length > 0
      && Object.keys(attributeRanges.value).includes(edgeVariables.value.width)
      && columnTypes.value[edgeVariables.value.width] === 'number'
    ) {
      const minValue = attributeRanges.value[edgeVariables.value.width].currentMin || attributeRanges.value[edgeVariables.value.width].min;
      const maxValue = attributeRanges.value[edgeVariables.value.width].currentMax || attributeRanges.value[edgeVariables.value.width].max;

      return scaleLinear().domain([minValue, maxValue]).range([1, 20]);
    }
    return scaleLinear();
  });

  const { height, width } = useWindowSize();
  function generateNodePositions(nodes: Node[]) {
    nodes.forEach((node) => {
      // If the position is not defined for x or y, generate it
      if (node.x === undefined || node.y === undefined) {
        node.x = Math.random() * width.value;
        node.y = Math.random() * height.value;
      }
    });
    return nodes;
  }

  async function fetchNetwork() {
    if (workspaceName.value === '' || networkName.value === '') {
      loadError.value = {
        message: 'Workspace and/or network were not defined in the url',
        href: 'https://multinet.app',
      };
      return;
    }
    let networkRequest: NetworkSpec | undefined;

    // Get all table names
    try {
      networkRequest = await api.network(workspaceName.value, networkName.value);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.status === 404) {
        loadError.value = {
          message: error.statusText,
          href: 'https://multinet.app',
        };
      } else if (error.status === 401) {
        loadError.value = {
          message: 'You are not authorized to view this workspace',
          href: 'https://multinet.app',
        };
      } else {
        loadError.value = {
          message: 'An unexpected error ocurred',
          href: 'https://multinet.app',
        };
      }
      return;
    } finally {
      if (loadError.value.message === '' && typeof networkRequest === 'undefined') {
        // Catches CORS errors, issues when DB/API are down, etc.
        loadError.value = {
          message: 'There was a network issue when getting data',
          href: `./?workspace=${workspaceName}&network=${networkName}`,
        };
      }
    }

    if (network === undefined) {
      return;
    }

    // Check network size
    if (networkRequest.node_count > 300) {
      loadError.value = {
        message: 'The network you are loading is too large',
        href: 'https://multinet.app',
      };
    }

    networkTables.value = await api.networkTables(workspaceName.value, networkName.value);
    // Get the network metadata promises
    const metadataPromises: Promise<ColumnTypes>[] = [];
    networkTables.value.forEach((table) => {
      metadataPromises.push(api.columnTypes(workspaceName.value, table.name));
    });

    // Resolve network metadata promises
    const resolvedMetadataPromises = await Promise.all(metadataPromises);

    // Combine all network metadata
    const columnTypesFromRequests: ColumnTypes = {};
    resolvedMetadataPromises.forEach((types) => {
      Object.assign(columnTypesFromRequests, types);
    });

    columnTypes.value = columnTypesFromRequests;

    if (loadError.value.message !== '') {
      return;
    }

    // Generate all node table promises
    const nodes = await api.nodes(workspaceName.value, networkName.value, { offset: 0, limit: 300 });

    // Generate and resolve edge table promise and extract rows
    const edges = await api.edges(workspaceName.value, networkName.value, { offset: 0, limit: 1000 });

    // Build the network object and set it as the network in the store
    const networkElements = {
      nodes: generateNodePositions(nodes.results as Node[]),
      edges: edges.results as Edge[],
    };
    network.value = networkElements;
  }

  async function fetchUserInfo() {
    const info = await api.userInfo();
    userInfo.value = info;
  }

  async function logout() {
    // Perform the server logout.
    oauthClient.logout();
    userInfo.value = null;
  }

  function startSimulation() {
    if (simulation.value !== null) {
      simulation.value.alpha(0.2);
      simulation.value.restart();
      simulationRunning.value = true;
    }
  }

  function stopSimulation() {
    if (simulation.value !== null) {
      simulation.value.stop();
      simulationRunning.value = false;
    }
  }

  function releaseNodes() {
    network.value.nodes.forEach((n: Node) => {
      n.fx = null;
      n.fy = null;
    });
    startSimulation();
  }

  function setNestedVariables(nestedVariablesInput: NestedVariables) {
    const newNestedVars = {
      ...nestedVariables.value,
      bar: [...new Set(nestedVariablesInput.bar)],
      glyph: [...new Set(nestedVariablesInput.glyph)],
    };

    // Allow only 2 variables for the glyphs
    newNestedVars.glyph.length = Math.min(2, newNestedVars.glyph.length);

    nestedVariables.value = newNestedVars;
  }

  function addAttributeRange(attributeRange: AttributeRange) {
    attributeRanges.value = { ...attributeRanges.value, [attributeRange.attr]: attributeRange };
  }

  watch(edgeLength, () => {
    // Apply force to simulation and restart it
    applyForceToSimulation(
      simulation.value,
      'edge',
      undefined,
      edgeLength.value,
    );
    startSimulation();
  });

  function applyVariableLayout(payload: { varName: string | null; axis: 'x' | 'y'}) {
    const {
      varName, axis,
    } = payload;
    const otherAxis = axis === 'x' ? 'y' : 'x';

    const updatedLayoutVars = { [axis]: varName, [otherAxis]: layoutVars.value[otherAxis] } as {
      x: string | null;
      y: string | null;
    };
    layoutVars.value = updatedLayoutVars;

    // Reapply the layout if there is still a variable
    if (varName === null && layoutVars.value[otherAxis] !== null) {
      applyVariableLayout({ varName: layoutVars.value[otherAxis], axis: otherAxis });
    } else if (varName === null && layoutVars.value[otherAxis] === null) {
      // If both null, release
      releaseNodes();
    }
  }

  return {
    workspaceName,
    networkName,
    network,
    columnTypes,
    selectedNodes,
    loadError,
    simulation,
    displayCharts,
    markerSize,
    fontSize,
    labelVariable,
    selectNeighbors,
    nestedVariables,
    edgeVariables,
    nodeSizeVariable,
    nodeColorVariable,
    attributeRanges,
    nodeBarColorScale,
    nodeGlyphColorScale,
    provenance,
    directionalEdges,
    simulationRunning,
    showProvenanceVis,
    rightClickMenu,
    userInfo,
    edgeLength,
    svgDimensions,
    layoutVars,
    nodeColorScale,
    edgeColorScale,
    nodeSizeScale,
    edgeWidthScale,
    fetchNetwork,
    fetchUserInfo,
    logout,
    startSimulation,
    stopSimulation,
    releaseNodes,
    setNestedVariables,
    addAttributeRange,
    applyVariableLayout,
    nodeTableNames,
    edgeTableName,
    snackBarMessage,
  };
});
