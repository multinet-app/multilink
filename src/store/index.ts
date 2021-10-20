import Vue from 'vue';
import Vuex from 'vuex';
import { createDirectStore } from 'direct-vuex';
import {
  forceCollide, Simulation,
} from 'd3-force';

import {
  Edge, Node, Network, SimulationEdge, State, EdgeStyleVariables, LoadError, NestedVariables, ProvenanceEventTypes, Dimensions, AttributeRange,
} from '@/types';
import api from '@/api';
import { ColumnTypes, NetworkSpec, UserSpec } from 'multinet';
import {
  scaleBand, ScaleLinear, scaleLinear, scaleOrdinal, scaleSequential,
} from 'd3-scale';
import { interpolateBlues, interpolateReds, schemeCategory10 } from 'd3-scale-chromatic';
import { initProvenance, Provenance } from '@visdesignlab/trrack';
import { undoRedoKeyHandler, updateProvenanceState } from '@/lib/provenanceUtils';
import { isInternalField } from '@/lib/typeUtils';
import { applyForceToSimulation } from '@/lib/d3ForceUtils';
import oauthClient from '@/oauth';

Vue.use(Vuex);

const {
  store,
  rootActionContext,
  moduleActionContext,
  rootGetterContext,
  moduleGetterContext,
} = createDirectStore({
  state: {
    workspaceName: null,
    networkName: null,
    network: null,
    columnTypes: null,
    selectedNodes: new Set(),
    loadError: {
      message: '',
      href: '',
    },
    simulation: null,
    displayCharts: false,
    markerSize: 50,
    fontSize: 12,
    labelVariable: undefined,
    selectNeighbors: true,
    nestedVariables: {
      bar: [],
      glyph: [],
    },
    edgeVariables: {
      width: '',
      color: '',
    },
    nodeSizeVariable: '',
    nodeColorVariable: '',
    attributeRanges: {},
    nodeColorScale: scaleOrdinal(schemeCategory10),
    nodeBarColorScale: scaleOrdinal(schemeCategory10),
    nodeGlyphColorScale: scaleOrdinal(schemeCategory10),
    edgeWidthScale: scaleLinear(),
    edgeColorScale: scaleOrdinal(schemeCategory10),
    provenance: null,
    directionalEdges: false,
    controlsWidth: 256,
    simulationRunning: false,
    showProvenanceVis: false,
    rightClickMenu: {
      show: false,
      top: 0,
      left: 0,
    },
    userInfo: null,
    edgeLength: 10,
    svgDimensions: {
      height: 0,
      width: 0,
    },
    layoutVars: {
      x: null,
      y: null,
    },
  } as State,

  getters: {
    nodeColorScale(state) {
      if (state.columnTypes !== null && Object.keys(state.columnTypes).length > 0 && state.columnTypes[state.nodeColorVariable] === 'number') {
        const minValue = state.attributeRanges[state.nodeColorVariable].currentMin || state.attributeRanges[state.nodeColorVariable].min;
        const maxValue = state.attributeRanges[state.nodeColorVariable].currentMax || state.attributeRanges[state.nodeColorVariable].max;

        return scaleSequential(interpolateBlues)
          .domain([minValue, maxValue]);
      }

      return state.nodeGlyphColorScale;
    },

    edgeColorScale(state) {
      if (state.columnTypes !== null && Object.keys(state.columnTypes).length > 0 && state.columnTypes[state.edgeVariables.color] === 'number') {
        const minValue = state.attributeRanges[state.edgeVariables.color].currentMin || state.attributeRanges[state.edgeVariables.color].min;
        const maxValue = state.attributeRanges[state.edgeVariables.color].currentMax || state.attributeRanges[state.edgeVariables.color].max;

        return scaleSequential(interpolateReds)
          .domain([minValue, maxValue]);
      }

      return state.nodeGlyphColorScale;
    },

    nodeSizeScale(state) {
      const minValue = state.attributeRanges[state.nodeSizeVariable].currentMin || state.attributeRanges[state.nodeSizeVariable].min;
      const maxValue = state.attributeRanges[state.nodeSizeVariable].currentMax || state.attributeRanges[state.nodeSizeVariable].max;

      return scaleLinear()
        .domain([minValue, maxValue])
        .range([10, 40]);
    },

    edgeWidthScale(state) {
      const minValue = state.attributeRanges[state.edgeVariables.width].currentMin || state.attributeRanges[state.edgeVariables.width].min;
      const maxValue = state.attributeRanges[state.edgeVariables.width].currentMax || state.attributeRanges[state.edgeVariables.width].max;

      return state.edgeWidthScale.domain([minValue, maxValue]).range([1, 20]);
    },
  },
  mutations: {
    setWorkspaceName(state, workspaceName: string) {
      state.workspaceName = workspaceName;
    },

    setNetworkName(state, networkName: string) {
      state.networkName = networkName;
    },

    setNetwork(state, network: Network) {
      state.network = network;
    },

    setColumnTypes(state, columnTypes: ColumnTypes) {
      state.columnTypes = columnTypes;
    },

    setSelected(state, selectedNodes: Set<string>) {
      state.selectedNodes = selectedNodes;

      if (state.provenance !== null) {
        if (selectedNodes.size === 0) {
          updateProvenanceState(state, 'Clear Selection');
        }
      }
    },

    setLoadError(state, loadError: LoadError) {
      state.loadError = {
        message: loadError.message,
        href: loadError.href,
      };
    },

    setSimulation(state, simulation: Simulation<Node, SimulationEdge>) {
      state.simulation = simulation;
    },

    startSimulation(state) {
      if (state.simulation !== null) {
        state.simulation.alpha(0.2);
        state.simulation.restart();
        state.simulationRunning = true;

        state.layoutVars = { x: null, y: null };
      }
    },

    stopSimulation(state) {
      if (state.simulation !== null) {
        state.simulation.stop();
        state.simulationRunning = false;
      }
    },

    addSelectedNode(state, nodesToAdd: string[]) {
      // If no nodes, do nothing
      if (nodesToAdd.length === 0) {
        return;
      }

      state.selectedNodes = new Set([...state.selectedNodes, ...nodesToAdd]);

      if (state.provenance !== null) {
        updateProvenanceState(state, 'Select Node(s)');
      }
    },

    removeSelectedNode(state, nodeID: string) {
      state.selectedNodes.delete(nodeID);
      state.selectedNodes = new Set(state.selectedNodes);

      if (state.provenance !== null) {
        updateProvenanceState(state, 'De-select Node');
      }
    },

    setDisplayCharts(state, displayCharts: boolean) {
      state.displayCharts = displayCharts;

      if (state.provenance !== null) {
        updateProvenanceState(state, 'Set Display Charts');
      }
    },

    setMarkerSize(state, payload: { markerSize: number; updateProv: boolean }) {
      const { markerSize, updateProv } = payload;
      state.markerSize = markerSize;

      // Apply force to simulation and restart it
      applyForceToSimulation(
        state.simulation,
        'collision',
        forceCollide((markerSize / 2) * 1.5),
      );

      if (state.provenance !== null && updateProv) {
        updateProvenanceState(state, 'Set Marker Size');
      }
    },

    setFontSize(state, payload: { fontSize: number; updateProv: boolean }) {
      state.fontSize = payload.fontSize;

      if (state.provenance !== null && payload.updateProv) {
        updateProvenanceState(state, 'Set Font Size');
      }
    },

    setLabelVariable(state, labelVariable: string | undefined) {
      state.labelVariable = labelVariable;

      if (state.provenance !== null) {
        updateProvenanceState(state, 'Set Label Variable');
      }
    },

    setNodeColorVariable(state, nodeColorVariable: string) {
      state.nodeColorVariable = nodeColorVariable;

      if (state.provenance !== null) {
        updateProvenanceState(state, 'Set Node Color Variable');
      }
    },

    setSelectNeighbors(state, selectNeighbors: boolean) {
      state.selectNeighbors = selectNeighbors;

      if (state.provenance !== null) {
        updateProvenanceState(state, 'Set Select Neighbors');
      }
    },

    setNestedVariables(state, nestedVariables: NestedVariables) {
      const newNestedVars = {
        ...nestedVariables,
        bar: [...new Set(nestedVariables.bar)],
        glyph: [...new Set(nestedVariables.glyph)],
      };

      // Allow only 2 variables for the glyphs
      newNestedVars.glyph.length = Math.min(2, newNestedVars.glyph.length);

      state.nestedVariables = newNestedVars;
    },

    setEdgeVariables(state, edgeVariables: EdgeStyleVariables) {
      state.edgeVariables = edgeVariables;
    },

    setNodeSizeVariable(state, nodeSizeVariable: string) {
      state.nodeSizeVariable = nodeSizeVariable;

      if (state.provenance !== null) {
        updateProvenanceState(state, 'Set Node Size Variable');
      }
    },

    addAttributeRange(state, attributeRange: AttributeRange) {
      state.attributeRanges = { ...state.attributeRanges, [attributeRange.attr]: attributeRange };
    },

    setProvenance(state, provenance: Provenance<State, ProvenanceEventTypes, unknown>) {
      state.provenance = provenance;
    },

    setDirectionalEdges(state, directionalEdges: boolean) {
      state.directionalEdges = directionalEdges;

      if (state.provenance !== null) {
        updateProvenanceState(state, 'Set Directional Edges');
      }
    },

    setEdgeLength(state, payload: { edgeLength: number; updateProv: boolean }) {
      const { edgeLength, updateProv } = payload;
      state.edgeLength = edgeLength;

      // Apply force to simulation and restart it
      applyForceToSimulation(
        state.simulation,
        'edge',
        undefined,
        edgeLength * 10,
      );
      store.commit.startSimulation();

      if (state.provenance !== null && updateProv) {
        updateProvenanceState(state, 'Set Edge Length');
      }
    },

    goToProvenanceNode(state, node: string) {
      if (state.provenance !== null) {
        state.provenance.goToNode(node);
      }
    },

    toggleShowProvenanceVis(state) {
      state.showProvenanceVis = !state.showProvenanceVis;
    },

    updateRightClickMenu(state, payload: { show: boolean; top: number; left: number }) {
      state.rightClickMenu = payload;
    },

    setUserInfo(state, userInfo: UserSpec | null) {
      state.userInfo = userInfo;
    },

    applyVariableLayout(state: State, payload: { varName: string; axis: 'x' | 'y'}) {
      // Set node size smaller
      store.commit.setMarkerSize({ markerSize: 10, updateProv: true });

      // Clear the label variable
      store.commit.setLabelVariable(undefined);

      store.commit.stopSimulation();

      if (state.network !== null && state.columnTypes !== null) {
        const {
          varName, axis,
        } = payload;
        const type = state.columnTypes[varName];
        const range = state.attributeRanges[varName];
        const maxPosition = axis === 'x' ? state.svgDimensions.width : state.svgDimensions.height;
        const otherAxis = axis === 'x' ? 'y' : 'x';
        const axisPadding = axis === 'x' ? 60 : 30;

        if (type === 'number') {
          let positionScale: ScaleLinear<number, number>;

          if (axis === 'x') {
            positionScale = scaleLinear()
              .domain([range.min, range.max])
              .range([axisPadding, maxPosition]);
          } else {
            positionScale = scaleLinear()
              .domain([range.min, range.max])
              .range([0, maxPosition - axisPadding]);
          }

          state.network.nodes.forEach((node) => {
            // eslint-disable-next-line no-param-reassign
            node[axis] = positionScale(node[varName]);
            // eslint-disable-next-line no-param-reassign
            node[`f${axis}`] = positionScale(node[varName]);

            if (state.layoutVars.x === null && state.layoutVars.y === null) {
              const otherSvgDimension = axis === 'x' ? state.svgDimensions.height : state.svgDimensions.width;
              // eslint-disable-next-line no-param-reassign
              node[otherAxis] = otherSvgDimension / 2;
              // eslint-disable-next-line no-param-reassign
              node[`f${otherAxis}`] = otherSvgDimension / 2;
            }
          });
        } else {
          const positionScale = scaleBand()
            .domain(range.binLabels)
            .range([0, maxPosition]);
          const positionOffset = maxPosition / (2 * range.binLabels.length);

          state.network.nodes.forEach((node) => {
            // eslint-disable-next-line no-param-reassign
            node[axis] = (positionScale(node[varName]) || 0) + positionOffset;
            // eslint-disable-next-line no-param-reassign
            node[`f${axis}`] = (positionScale(node[varName]) || 0) + positionOffset;

            if (state.layoutVars.x === null && state.layoutVars.y === null) {
              const otherSvgDimension = axis === 'x' ? state.svgDimensions.height : state.svgDimensions.width;
              // eslint-disable-next-line no-param-reassign
              node[otherAxis] = otherSvgDimension / 2;
              // eslint-disable-next-line no-param-reassign
              node[`f${otherAxis}`] = otherSvgDimension / 2;
            }
          });
        }

        const updatedLayoutVars = { [axis]: varName, [otherAxis]: state.layoutVars[otherAxis] } as {
          x: string | null;
          y: string | null;
        };
        state.layoutVars = updatedLayoutVars;
      }
    },

    setSvgDimensions(state: State, payload: Dimensions) {
      state.svgDimensions = payload;
    },
  },
  actions: {
    async fetchNetwork(context, { workspaceName, networkName }) {
      const { commit } = rootActionContext(context);
      commit.setWorkspaceName(workspaceName);
      commit.setNetworkName(networkName);

      let network: NetworkSpec | undefined;

      // Get all table names
      try {
        network = await api.network(workspaceName, networkName);
      } catch (error) {
        if (error.status === 404) {
          if (workspaceName === undefined || networkName === undefined) {
            commit.setLoadError({
              message: 'Workspace and/or network were not defined in the url',
              href: 'https://multinet.app',
            });
          } else {
            commit.setLoadError({
              message: error.statusText,
              href: 'https://multinet.app',
            });
          }
        } else if (error.status === 401) {
          commit.setLoadError({
            message: 'You are not authorized to view this workspace',
            href: 'https://multinet.app',
          });
        } else {
          commit.setLoadError({
            message: 'An unexpected error ocurred',
            href: 'https://multinet.app',
          });
        }
      } finally {
        if (store.state.loadError.message === '' && typeof network === 'undefined') {
          // Catches CORS errors, issues when DB/API are down, etc.
          commit.setLoadError({
            message: 'There was a network issue when getting data',
            href: `./?workspace=${workspaceName}&network=${networkName}`,
          });
        }
      }

      if (network === undefined) {
        return;
      }

      // Check network size
      if (network.node_count > 300) {
        commit.setLoadError({
          message: 'The network you are loading is too large',
          href: 'https://multinet.app',
        });
      }

      if (store.state.loadError.message !== '') {
        return;
      }

      // Generate all node table promises
      const nodes = await api.nodes(workspaceName, networkName, { offset: 0, limit: 300 });

      // Generate and resolve edge table promise and extract rows
      const edges = await api.edges(workspaceName, networkName, { offset: 0, limit: 1000 });

      // Build the network object and set it as the network in the store
      const networkElements = {
        nodes: nodes.results as Node[],
        edges: edges.results as Edge[],
      };
      commit.setNetwork(networkElements);

      const networkTables = await api.networkTables(workspaceName, networkName);
      // Get the network metadata promises
      const metadataPromises: Promise<ColumnTypes>[] = [];
      networkTables.forEach((table) => {
        metadataPromises.push(api.columnTypes(workspaceName, table.name));
      });

      // Resolve network metadata promises
      const resolvedMetadataPromises = await Promise.all(metadataPromises);

      // Combine all network metadata
      const columnTypes: ColumnTypes = {};
      resolvedMetadataPromises.forEach((types) => {
        Object.assign(columnTypes, types);
      });

      commit.setColumnTypes(columnTypes);

      // Guess the best label variable and set it
      const allVars: Set<string> = new Set();
      networkElements.nodes.map((node: Node) => Object.keys(node).forEach((key) => allVars.add(key)));

      const bestLabelVar = [...allVars]
        .find((colName) => !isInternalField(colName) && context.state.columnTypes[colName] === 'label');
      commit.setLabelVariable(bestLabelVar);
    },

    async fetchUserInfo(context) {
      const { commit } = rootActionContext(context);

      const info = await api.userInfo();
      commit.setUserInfo(info);
    },

    async logout(context) {
      const { commit } = rootActionContext(context);

      // Perform the server logout.
      oauthClient.logout();
      commit.setUserInfo(null);
    },

    releaseNodes(context) {
      const { commit } = rootActionContext(context);

      if (context.state.network !== null) {
        context.state.network.nodes.forEach((n: Node) => {
          // eslint-disable-next-line no-param-reassign
          n.fx = null;
          // eslint-disable-next-line no-param-reassign
          n.fy = null;
        });
        commit.startSimulation();
      }
    },

    createProvenance(context) {
      const { commit } = rootActionContext(context);

      const storeState = context.state;

      const stateForProv = JSON.parse(JSON.stringify(context.state));
      stateForProv.selectedNodes = new Set<string>();

      commit.setProvenance(initProvenance<State, ProvenanceEventTypes, unknown>(
        stateForProv,
        { loadFromUrl: false },
      ));

      // Add a global observer to watch the state and update the tracked elements in the store
      // enables undo/redo + navigating around provenance graph
      storeState.provenance.addGlobalObserver(
        () => {
          const provenanceState = context.state.provenance.state;

          const { selectedNodes } = provenanceState;

          // Helper function
          const setsAreEqual = (a: Set<unknown>, b: Set<unknown>) => a.size === b.size && [...a].every((value) => b.has(value));

          // If the sets are not equal (happens when provenance is updated through provenance vis),
          // update the store's selectedNodes to match the provenance state
          if (!setsAreEqual(selectedNodes, storeState.selectedNodes)) {
            storeState.selectedNodes = selectedNodes;
          }

          // Iterate through vars with primitive data types
          [
            'displayCharts',
            'markerSize',
            'fontSize',
            'labelVariable',
            'nodeSizeVariable',
            'nodeColorVariable',
            'selectNeighbors',
            'directionalEdges',
            'edgeLength',
          ].forEach((primitiveVariable) => {
            // If not modified, don't update
            if (provenanceState[primitiveVariable] === storeState[primitiveVariable]) {
              return;
            }

            if (primitiveVariable === 'markerSize') {
              commit.setMarkerSize({ markerSize: provenanceState[primitiveVariable], updateProv: false });
            } else if (primitiveVariable === 'edgeLength') {
              commit.setEdgeLength({ edgeLength: provenanceState[primitiveVariable], updateProv: false });
            } else if (storeState[primitiveVariable] !== provenanceState[primitiveVariable]) {
              storeState[primitiveVariable] = provenanceState[primitiveVariable];
            }
          });
        },
      );

      storeState.provenance.done();

      // Add keydown listener for undo/redo
      document.addEventListener('keydown', (event) => undoRedoKeyHandler(event, storeState));
    },

    guessLabel(context) {
      const { commit } = rootActionContext(context);

      // Guess the best label variable and set it
      const allVars: Set<string> = new Set();
      context.state.network.nodes.forEach((node: Node) => Object.keys(node).forEach((key) => allVars.add(key)));

      // Remove _key from the search
      allVars.delete('_key');
      const bestLabelVar = [...allVars]
        .find((colName) => !isInternalField(colName) && context.state.columnTypes[colName] === 'label');

      // Use the label variable we found or _key if we didn't find one
      commit.setLabelVariable(bestLabelVar || '_key');
    },
  },
});

export default store;
export {
  rootActionContext,
  moduleActionContext,
  rootGetterContext,
  moduleGetterContext,
};

// The following lines enable types in the injected store '$store'.
export type ApplicationStore = typeof store;
declare module 'vuex' {
  interface Store<S> {
    direct: ApplicationStore;
  }
}
