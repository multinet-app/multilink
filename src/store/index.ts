import { defineStore, storeToRefs } from 'pinia';
import { forceCollide, Simulation } from 'd3-force';
import { ColumnTypes, NetworkSpec, UserSpec } from 'multinet';
import { scaleLinear, scaleOrdinal, scaleSequential } from 'd3-scale';
import { interpolateBlues, interpolateReds, schemeCategory10 } from 'd3-scale-chromatic';
import api from '@/api';
import {
  Edge, Node, NestedVariables, AttributeRanges, LoadError, Network, SimulationEdge, AttributeRange,
} from '@/types';
import { isInternalField } from '@/lib/typeUtils';
import { applyForceToSimulation } from '@/lib/d3ForceUtils';
import oauthClient from '@/oauth';
import { computed, ref } from 'vue';
import { useProvenanceStore } from '@/store/provenance';

export const useStore = defineStore('store', () => {
  // Provenance
  const provStore = useProvenanceStore();
  const { provenance } = provStore;
  const {
    selectNeighbors,
  } = storeToRefs(provStore);

  const workspaceName = ref('');
  const networkName = ref('');
  const network = ref<Network>({ nodes: [], edges: [] });
  const columnTypes = ref<ColumnTypes | null>(null);
  const selectedNodes = ref<string[]>([]);
  const loadError = ref<LoadError>({
    message: '',
    href: '',
  });
  const simulation = ref<Simulation<Node, SimulationEdge> | null>(null);
  const displayCharts = ref(false);
  const markerSize = ref(50);
  const fontSize = ref(12);
  const labelVariable = ref<string | undefined>(undefined);
  const nestedVariables = ref<NestedVariables>({
    bar: [],
    glyph: [],
  });
  const edgeVariables = ref({
    width: '',
    color: '',
  });
  const nodeSizeVariable = ref('');
  const nodeColorVariable = ref('');
  const attributeRanges = ref<AttributeRanges>({});
  const nodeBarColorScale = ref(scaleOrdinal(schemeCategory10));
  const nodeGlyphColorScale = ref(scaleOrdinal(schemeCategory10));
  const directionalEdges = ref(false);
  const controlsWidth = ref(256);
  const simulationRunning = ref(false);
  const showProvenanceVis = ref(false);
  const rightClickMenu = ref({
    show: false,
    top: 0,
    left: 0,
  });
  const userInfo = ref<UserSpec | null>(null);
  const edgeLength = ref(10);
  const svgDimensions = ref({
    height: 0,
    width: 0,
  });
  const layoutVars = ref<{ x: string | null; y: string | null }>({
    x: null,
    y: null,
  });

  const nodeColorScale = computed(() => {
    if (columnTypes.value !== null && Object.keys(columnTypes.value).length > 0 && columnTypes.value[nodeColorVariable.value] === 'number') {
      const minValue = attributeRanges.value[nodeColorVariable.value].currentMin || attributeRanges.value[nodeColorVariable.value].min;
      const maxValue = attributeRanges.value[nodeColorVariable.value].currentMax || attributeRanges.value[nodeColorVariable.value].max;

      return scaleSequential(interpolateBlues)
        .domain([minValue, maxValue]);
    }

    return nodeGlyphColorScale;
  });

  const edgeColorScale = computed(() => {
    if (columnTypes.value !== null && Object.keys(columnTypes.value).length > 0 && columnTypes.value[edgeVariables.value.color] === 'number') {
      const minValue = attributeRanges.value[edgeVariables.value.color].currentMin || attributeRanges.value[edgeVariables.value.color].min;
      const maxValue = attributeRanges.value[edgeVariables.value.color].currentMax || attributeRanges.value[edgeVariables.value.color].max;

      return scaleSequential(interpolateReds)
        .domain([minValue, maxValue]);
    }

    return scaleSequential(interpolateReds);
  });

  const nodeSizeScale = computed(() => {
    if (columnTypes.value !== null && Object.keys(columnTypes.value).length > 0 && columnTypes.value[nodeSizeVariable.value]) {
      const minValue = attributeRanges.value[nodeSizeVariable.value].currentMin || attributeRanges.value[nodeSizeVariable.value].min;
      const maxValue = attributeRanges.value[nodeSizeVariable.value].currentMax || attributeRanges.value[nodeSizeVariable.value].max;

      return scaleLinear()
        .domain([minValue, maxValue])
        .range([10, 40]);
    }
    return scaleLinear();
  });

  const edgeWidthScale = computed(() => {
    if (columnTypes.value !== null && Object.keys(columnTypes.value).length > 0 && columnTypes.value[edgeVariables.value.width] === 'number') {
      const minValue = attributeRanges.value[edgeVariables.value.width].currentMin || attributeRanges.value[edgeVariables.value.width].min;
      const maxValue = attributeRanges.value[edgeVariables.value.width].currentMax || attributeRanges.value[edgeVariables.value.width].max;

      return scaleLinear().domain([minValue, maxValue]).range([1, 20]);
    }
    return scaleLinear();
  });

  function guessLabel() {
    if (columnTypes.value !== null) {
    // Guess the best label variable and set it
      const allVars: Set<string> = new Set();
      network.value.nodes.forEach((node: Node) => Object.keys(node).forEach((key) => allVars.add(key)));

      // Remove _key from the search
      allVars.delete('_key');
      const bestLabelVar = [...allVars]
        .find((colName) => !isInternalField(colName) && columnTypes.value?.[colName] === 'label');

      // Use the label variable we found or _key if we didn't find one
      labelVariable.value = bestLabelVar || '_key';
    }
  }

  async function fetchNetwork(workspaceNameInput: string | undefined, networkNameInput: string | undefined) {
    if (workspaceNameInput === undefined || networkNameInput === undefined) {
      loadError.value = {
        message: 'Workspace and/or network were not defined in the url',
        href: 'https://multinet.app',
      };
      return;
    }

    workspaceName.value = workspaceNameInput;
    networkName.value = networkNameInput;

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

    if (loadError.value.message !== '') {
      return;
    }

    // Generate all node table promises
    const nodes = await api.nodes(workspaceName.value, networkName.value, { offset: 0, limit: 300 });

    // Generate and resolve edge table promise and extract rows
    const edges = await api.edges(workspaceName.value, networkName.value, { offset: 0, limit: 1000 });

    // Build the network object and set it as the network in the store
    const networkElements = {
      nodes: nodes.results as Node[],
      edges: edges.results as Edge[],
    };
    network.value = networkElements;

    const networkTables = await api.networkTables(workspaceName.value, networkName.value);
    // Get the network metadata promises
    const metadataPromises: Promise<ColumnTypes>[] = [];
    networkTables.forEach((table) => {
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

    // Guess the best label variable and set it
    const allVars: Set<string> = new Set();
    networkElements.nodes.map((node: Node) => Object.keys(node).forEach((key) => allVars.add(key)));

    guessLabel();
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

  function setMarkerSize(markerSizeInput: number, updateProv: boolean) {
    markerSize.value = markerSizeInput;

    // Apply force to simulation and restart it
    applyForceToSimulation(
      simulation.value,
      'collision',
      forceCollide((markerSize.value / 2) * 1.5),
    );
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

  function setEdgeLength(edgeLengthInput: number, updateProv: boolean) {
    edgeLength.value = edgeLengthInput;

    // Apply force to simulation and restart it
    applyForceToSimulation(
      simulation.value,
      'edge',
      undefined,
      edgeLength.value * 10,
    );
    startSimulation();
  }

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
      // Set marker size to 11 to trigger re-render (will get reset to 10 in dispatch again)
      markerSize.value = 11;

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
    controlsWidth,
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
    setMarkerSize,
    setNestedVariables,
    addAttributeRange,
    setEdgeLength,
    guessLabel,
    applyVariableLayout,
  };
});
