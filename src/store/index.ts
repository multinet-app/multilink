import { defineStore } from 'pinia';
import { forceCollide } from 'd3-force';
import { ColumnTypes, NetworkSpec } from 'multinet';
import { scaleLinear, scaleOrdinal, scaleSequential } from 'd3-scale';
import { interpolateBlues, interpolateReds, schemeCategory10 } from 'd3-scale-chromatic';
import { initProvenance } from '@visdesignlab/trrack';
import api from '@/api';
import {
  Edge, Node, State, NestedVariables, ProvenanceEventTypes, AttributeRange,
} from '@/types';
import { undoRedoKeyHandler, updateProvenanceState } from '@/lib/provenanceUtils';
import { isInternalField } from '@/lib/typeUtils';
import { applyForceToSimulation } from '@/lib/d3ForceUtils';
import oauthClient from '@/oauth';

export const useStore = defineStore('store', {
  state: (): State => ({
    workspaceName: null,
    networkName: null,
    network: null,
    columnTypes: null,
    selectedNodes: [],
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
    nodeColorScaleNoDomain: scaleOrdinal(schemeCategory10),
    nodeBarColorScale: scaleOrdinal(schemeCategory10),
    nodeGlyphColorScale: scaleOrdinal(schemeCategory10),
    edgeWidthScaleNoDomain: scaleLinear(),
    edgeColorScaleNoDomain: scaleOrdinal(schemeCategory10),
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
  }),

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
      if (state.columnTypes !== null && Object.keys(state.columnTypes).length > 0 && state.columnTypes[state.nodeSizeVariable]) {
        const minValue = state.attributeRanges[state.nodeSizeVariable].currentMin || state.attributeRanges[state.nodeSizeVariable].min;
        const maxValue = state.attributeRanges[state.nodeSizeVariable].currentMax || state.attributeRanges[state.nodeSizeVariable].max;

        return scaleLinear()
          .domain([minValue, maxValue])
          .range([10, 40]);
      }
      return scaleLinear();
    },

    edgeWidthScale(state) {
      if (state.columnTypes !== null && Object.keys(state.columnTypes).length > 0 && state.columnTypes[state.edgeVariables.width] === 'number') {
        const minValue = state.attributeRanges[state.edgeVariables.width].currentMin || state.attributeRanges[state.edgeVariables.width].min;
        const maxValue = state.attributeRanges[state.edgeVariables.width].currentMax || state.attributeRanges[state.edgeVariables.width].max;

        return state.edgeWidthScaleNoDomain.domain([minValue, maxValue]).range([1, 20]);
      }
      return state.edgeWidthScaleNoDomain;
    },
  },

  actions: {
    async fetchNetwork(workspaceName: string, networkName: string) {
      this.workspaceName = workspaceName;
      this.networkName = networkName;

      let network: NetworkSpec | undefined;

      // Get all table names
      try {
        network = await api.network(workspaceName, networkName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        if (error.status === 404) {
          if (workspaceName === undefined || networkName === undefined) {
            this.loadError = {
              message: 'Workspace and/or network were not defined in the url',
              href: 'https://multinet.app',
            };
          } else {
            this.loadError = {
              message: error.statusText,
              href: 'https://multinet.app',
            };
          }
        } else if (error.status === 401) {
          this.loadError = {
            message: 'You are not authorized to view this workspace',
            href: 'https://multinet.app',
          };
        } else {
          this.loadError = {
            message: 'An unexpected error ocurred',
            href: 'https://multinet.app',
          };
        }
      } finally {
        if (this.loadError.message === '' && typeof network === 'undefined') {
          // Catches CORS errors, issues when DB/API are down, etc.
          this.loadError = {
            message: 'There was a network issue when getting data',
            href: `./?workspace=${workspaceName}&network=${networkName}`,
          };
        }
      }

      if (network === undefined) {
        return;
      }

      // Check network size
      if (network.node_count > 300) {
        this.loadError = {
          message: 'The network you are loading is too large',
          href: 'https://multinet.app',
        };
      }

      if (this.loadError.message !== '') {
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
      this.network = networkElements;

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

      this.columnTypes = columnTypes;

      // Guess the best label variable and set it
      const allVars: Set<string> = new Set();
      networkElements.nodes.map((node: Node) => Object.keys(node).forEach((key) => allVars.add(key)));

      this.guessLabel();
    },

    async fetchUserInfo() {
      const info = await api.userInfo();
      this.userInfo = info;
    },

    async logout() {
      // Perform the server logout.
      oauthClient.logout();
      this.userInfo = null;
    },

    releaseNodes() {
      if (this.network !== null) {
        this.network.nodes.forEach((n: Node) => {
          n.fx = null;
          n.fy = null;
        });
        this.startSimulation();
      }
    },

    startSimulation() {
      if (this.simulation !== null) {
        this.simulation.alpha(0.2);
        this.simulation.restart();
        this.simulationRunning = true;
      }
    },

    stopSimulation() {
      if (this.simulation !== null) {
        this.simulation.stop();
        this.simulationRunning = false;
      }
    },

    setMarkerSize(payload: { markerSize: number; updateProv: boolean }) {
      const { markerSize, updateProv } = payload;
      this.markerSize = markerSize;

      // Apply force to simulation and restart it
      applyForceToSimulation(
        this.simulation,
        'collision',
        forceCollide((markerSize / 2) * 1.5),
      );

      if (this.provenance !== null && updateProv) {
        updateProvenanceState(this.$state, 'Set Marker Size');
      }
    },

    setNestedVariables(nestedVariables: NestedVariables) {
      const newNestedVars = {
        ...nestedVariables,
        bar: [...new Set(nestedVariables.bar)],
        glyph: [...new Set(nestedVariables.glyph)],
      };

      // Allow only 2 variables for the glyphs
      newNestedVars.glyph.length = Math.min(2, newNestedVars.glyph.length);

      this.nestedVariables = newNestedVars;
    },

    addAttributeRange(attributeRange: AttributeRange) {
      this.attributeRanges = { ...this.attributeRanges, [attributeRange.attr]: attributeRange };
    },

    setEdgeLength(payload: { edgeLength: number; updateProv: boolean }) {
      const { edgeLength, updateProv } = payload;
      this.edgeLength = edgeLength;

      // Apply force to simulation and restart it
      applyForceToSimulation(
        this.simulation,
        'edge',
        undefined,
        edgeLength * 10,
      );
      this.startSimulation();

      if (this.provenance !== null && updateProv) {
        updateProvenanceState(this.$state, 'Set Edge Length');
      }
    },

    goToProvenanceNode(node: string) {
      if (this.provenance !== null) {
        this.provenance.goToNode(node);
      }
    },

    createProvenance() {
      const storeState = this.$state;

      const stateForProv = JSON.parse(JSON.stringify(this));
      stateForProv.selectedNodes = [];

      this.provenance = initProvenance<State, ProvenanceEventTypes, unknown>(
        stateForProv,
        { loadFromUrl: false },
      );

      // Add a global observer to watch the state and update the tracked elements in the store
      // enables undo/redo + navigating around provenance graph
      this.provenance.addGlobalObserver(
        () => {
          const provenanceState = this.provenance.state;

          const { selectedNodes } = provenanceState;

          // Helper function
          const setsAreEqual = (a: Set<unknown>, b: Set<unknown>) => a.size === b.size && [...a].every((value) => b.has(value));

          // If the sets are not equal (happens when provenance is updated through provenance vis),
          // update the store's selectedNodes to match the provenance state
          if (selectedNodes.sort().toString() !== storeState.selectedNodes.sort().toString()) {
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
              this.setMarkerSize({ markerSize: provenanceState[primitiveVariable], updateProv: false });
            } else if (primitiveVariable === 'edgeLength') {
              this.setEdgeLength({ edgeLength: provenanceState[primitiveVariable], updateProv: false });
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

    guessLabel() {
      if (this.network !== null && this.columnTypes !== null) {
      // Guess the best label variable and set it
        const allVars: Set<string> = new Set();
        this.network.nodes.forEach((node: Node) => Object.keys(node).forEach((key) => allVars.add(key)));

        // Remove _key from the search
        allVars.delete('_key');
        const bestLabelVar = [...allVars]
          .find((colName) => !isInternalField(colName) && this.columnTypes?.[colName] === 'label');

        // Use the label variable we found or _key if we didn't find one
        this.labelVariable = bestLabelVar || '_key';
      }
    },

    applyVariableLayout(payload: { varName: string | null; axis: 'x' | 'y'}) {
      const {
        varName, axis,
      } = payload;
      const otherAxis = axis === 'x' ? 'y' : 'x';

      const updatedLayoutVars = { [axis]: varName, [otherAxis]: this.layoutVars[otherAxis] } as {
        x: string | null;
        y: string | null;
      };
      this.layoutVars = updatedLayoutVars;

      // Reapply the layout if there is still a variable
      if (varName === null && this.layoutVars[otherAxis] !== null) {
        // Set marker size to 11 to trigger re-render (will get reset to 10 in dispatch again)
        this.markerSize = 11;

        this.applyVariableLayout({ varName: this.layoutVars[otherAxis], axis: otherAxis });
      } else if (varName === null && this.layoutVars[otherAxis] === null) {
        // If both null, release
        this.releaseNodes();
      }
    },
  },
});
