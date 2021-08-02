import Vue from 'vue';
import Vuex from 'vuex';
import { createDirectStore } from 'direct-vuex';
import {
  forceCollide, Simulation,
} from 'd3-force';

import {
  Link, Node, Network, NetworkMetadata, SimulationLink, State, LinkStyleVariables, LoadError, NestedVariables, ProvenanceEventTypes, Dimensions, AttributeRange,
} from '@/types';
import api from '@/api';
import {
  GraphSpec, RowsSpec, TableMetadata, TableRow, UserSpec,
} from 'multinet';
import {
  scaleLinear, scaleOrdinal, scaleSequential,
} from 'd3-scale';
import { interpolateBlues, interpolateReds, schemeCategory10 } from 'd3-scale-chromatic';
import { initProvenance, Provenance } from '@visdesignlab/trrack';
import { undoRedoKeyHandler, updateProvenanceState } from '@/lib/provenanceUtils';
import { isInternalField } from '@/lib/typeUtils';
import { applyForceToSimulation } from '@/lib/d3ForceUtils';

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
    networkMetadata: null,
    columnTypes: {},
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
    linkVariables: {
      width: '',
      color: '',
    },
    nodeSizeVariable: '',
    nodeColorVariable: '',
    attributeRanges: {},
    nodeColorScale: scaleOrdinal(schemeCategory10),
    nodeBarColorScale: scaleOrdinal(schemeCategory10),
    nodeGlyphColorScale: scaleOrdinal(schemeCategory10),
    linkWidthScale: scaleLinear(),
    linkColorScale: scaleOrdinal(schemeCategory10),
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
    linkLength: 10,
    svgDimensions: {
      height: 0,
      width: 0,
    },
  } as State,

  getters: {
    nodeColorScale(state) {
      if (Object.keys(state.columnTypes).length > 0 && state.columnTypes[state.nodeColorVariable] === 'number') {
        const minValue = state.attributeRanges[state.nodeColorVariable].currentMin || state.attributeRanges[state.nodeColorVariable].min;
        const maxValue = state.attributeRanges[state.nodeColorVariable].currentMax || state.attributeRanges[state.nodeColorVariable].max;

        return scaleSequential(interpolateBlues)
          .domain([minValue, maxValue]);
      }

      return state.nodeGlyphColorScale;
    },

    linkColorScale(state) {
      if (Object.keys(state.columnTypes).length > 0 && state.columnTypes[state.linkVariables.color] === 'number') {
        const minValue = state.attributeRanges[state.linkVariables.color].currentMin || state.attributeRanges[state.linkVariables.color].min;
        const maxValue = state.attributeRanges[state.linkVariables.color].currentMax || state.attributeRanges[state.linkVariables.color].max;

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

    linkWidthScale(state) {
      const minValue = state.attributeRanges[state.linkVariables.width].currentMin || state.attributeRanges[state.linkVariables.width].min;
      const maxValue = state.attributeRanges[state.linkVariables.width].currentMax || state.attributeRanges[state.linkVariables.width].max;

      return state.linkWidthScale.domain([minValue, maxValue]).range([1, 20]);
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

    setNetworkMetadata(state, networkMetadata: NetworkMetadata) {
      state.networkMetadata = networkMetadata;
    },

    setColumnTypes(state, networkMetadata: NetworkMetadata) {
      const typeMapping: { [key: string]: string } = {};

      if (networkMetadata !== null) {
        Object.values(networkMetadata).forEach((metadata) => {
          (metadata as TableMetadata).table.columns.forEach((columnType) => {
            typeMapping[columnType.key] = columnType.type;
          });
        });
      }

      state.columnTypes = typeMapping;
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

    setSimulation(state, simulation: Simulation<Node, SimulationLink>) {
      state.simulation = simulation;
    },

    startSimulation(state) {
      if (state.simulation !== null) {
        state.simulation.alpha(0.2);
        state.simulation.restart();
        state.simulationRunning = true;
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
      store.commit.startSimulation();

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

    setLinkVariables(state, linkVariables: LinkStyleVariables) {
      state.linkVariables = linkVariables;
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

    setLinkLength(state, payload: { linkLength: number; updateProv: boolean }) {
      const { linkLength, updateProv } = payload;
      state.linkLength = linkLength;

      // Apply force to simulation and restart it
      applyForceToSimulation(
        state.simulation,
        'link',
        undefined,
        linkLength * 10,
      );
      store.commit.startSimulation();

      if (state.provenance !== null && updateProv) {
        updateProvenanceState(state, 'Set Link Length');
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

    applyNumericLayout(state: State, payload: { varName: string; axis: 'x' | 'y'; firstLayout: boolean }) {
      // Set node size smaller
      store.commit.setMarkerSize({ markerSize: 10, updateProv: true });

      // Clear the label variable
      store.commit.setLabelVariable(undefined);

      store.commit.stopSimulation();

      if (state.network !== null) {
        const { varName, axis, firstLayout } = payload;
        const range = state.attributeRanges[varName];
        const positionScale = scaleLinear()
          .domain([range.min, range.max])
          .range([0, axis === 'x' ? state.svgDimensions.width : state.svgDimensions.height]);

        const newNodes = state.network.nodes.map((oldNode) => {
          const node = { ...oldNode };
          // eslint-disable-next-line no-param-reassign
          node[axis] = positionScale(node[varName]);
          // eslint-disable-next-line no-param-reassign
          node[`f${axis}`] = positionScale(node[varName]);

          if (firstLayout) {
            const otherAxis = axis === 'x' ? 'y' : 'x';
            const otherSvgDimension = axis === 'x' ? state.svgDimensions.height : state.svgDimensions.width;
            // eslint-disable-next-line no-param-reassign
            node[otherAxis] = otherSvgDimension / 2;
            // eslint-disable-next-line no-param-reassign
            node[`f${otherAxis}`] = otherSvgDimension / 2;
          }

          return node;
        });

        store.commit.setNetwork({
          nodes: newNodes,
          edges: state.network.edges,
        });
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

      let networkTables: GraphSpec | undefined;

      // Get all table names
      try {
        networkTables = await api.graph(workspaceName, networkName);
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
        if (context.state.loadError.message === '' && typeof networkTables === 'undefined') {
          // Catches CORS errors, issues when DB/API are down, etc.
          commit.setLoadError({
            message: 'There was a network issue when getting data',
            href: `./?workspace=${workspaceName}&graph=${networkName}`,
          });
        }
      }

      if (networkTables === undefined) {
        return;
      }

      // Generate all node table promises
      const nodePromises: Promise<RowsSpec>[] = [];
      networkTables.nodeTables.forEach((table) => {
        nodePromises.push(api.table(workspaceName, table, { offset: 0, limit: 1000 }));
      });

      // Resolve all node table promises and extract the rows
      const resolvedNodePromises = await Promise.all(nodePromises);
      const nodes: TableRow[] = [];
      resolvedNodePromises.forEach((resolvedPromise) => {
        nodes.push(...resolvedPromise.rows);
      });

      // Generate and resolve edge table promise and extract rows
      const edgePromise = await api.table(workspaceName, networkTables.edgeTable, { offset: 0, limit: 1000 });
      const edges = edgePromise.rows;

      // Build the network object and set it as the network in the store
      const network = {
        nodes: nodes as Node[],
        edges: edges as Link[],
      };
      commit.setNetwork(network);

      // Get the network metadata promises
      const metadataPromises: Promise<TableMetadata>[] = [];
      networkTables.nodeTables.forEach((table) => {
        metadataPromises.push(api.tableMetadata(workspaceName, table));
      });
      metadataPromises.push(api.tableMetadata(workspaceName, networkTables.edgeTable));

      // Resolve network metadata promises
      const resolvedMetadataPromises = await Promise.all(metadataPromises);

      // Combine all network metadata
      const networkMetadata: NetworkMetadata = {};
      resolvedMetadataPromises.forEach((metadata) => {
        const tableName = metadata.item_id;
        networkMetadata[tableName] = metadata;
      });

      commit.setNetworkMetadata(networkMetadata);
      commit.setColumnTypes(networkMetadata);

      // Guess the best label variable and set it
      const allVars: Set<string> = new Set();
      network.nodes.map((node: Node) => Object.keys(node).forEach((key) => allVars.add(key)));

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
      await api.logout();
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
            'linkLength',
          ].forEach((primitiveVariable) => {
            // If not modified, don't update
            if (provenanceState[primitiveVariable] === storeState[primitiveVariable]) {
              return;
            }

            if (primitiveVariable === 'markerSize') {
              commit.setMarkerSize({ markerSize: provenanceState[primitiveVariable], updateProv: false });
            } else if (primitiveVariable === 'linkLength') {
              commit.setLinkLength({ linkLength: provenanceState[primitiveVariable], updateProv: false });
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
