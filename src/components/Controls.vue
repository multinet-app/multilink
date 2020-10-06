<script>
import NodeLink from '@/components/NodeLink/NodeLink.vue';
import Legend from '@/components/NodeLink/Legend.vue';

import { setUpProvenance, undo, redo } from '@/lib/provenance';
import { getUrlVars } from '@/lib/utils';
import { loadData } from '@/lib/multinet';
import { DataTooBigError } from '@/lib/errors';

import { scaleLinear, scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

export default {
  components: {
    NodeLink,
    Legend,
  },

  data() {
    return {
      provenance: null,
      graphStructure: {
        nodes: [],
        links: [],
      },
      nodeMarkerSize: 50,
      nodeFontSize: 14,
      workspace: null,
      graph: null,
      selectNeighbors: true,
      renderNested: false,
      labelVariable: '_key',
      colorVariable: null,
      nodeColorScale: scaleOrdinal(schemeCategory10),
      linkColorScale: scaleOrdinal().range(schemeCategory10),
      glyphColorScale: scaleOrdinal(schemeCategory10),
      nodeAttrScales: {},
      barVariables: [],
      glyphVariables: [],
      widthVariables: [],
      colorVariables: [],
      linkWidthScale: scaleLinear().domain([0, 10]).range([2, 20]),
      loadError: false,
      loadErrorData: {},
    };
  },

  computed: {
    variableList() {
      return this.multiVariableList.concat([null]);
    },
    multiVariableList() {
      if (typeof this.graphStructure.nodes[0] !== 'undefined') {
        // Loop through all nodes, flatten the 2d array, and turn it into a set
        let allVars = this.graphStructure.nodes.map((node) => Object.keys(node));
        allVars = [].concat.apply([], allVars);
        allVars = [...new Set(allVars)];
        return allVars;
      }
      return [];
    },
    colorVariableList() {
      return this.multiVariableList.concat(['table', null]);
    },
    linkVariableList() {
      if (typeof this.graphStructure.links[0] !== 'undefined') {
        // Loop through all links, flatten the 2d array, and turn it into a set
        let allVars = this.graphStructure.links.map((node) => Object.keys(node));
        allVars = [].concat.apply([], allVars);
        allVars = [...new Set(allVars)].filter((d) => d !== 'source' && d !== 'target');
        return allVars;
      }
      return [];
    },
  },

  async mounted() {
    const { workspace, graph, host } = getUrlVars();
    if (!workspace || !graph) {
      this.loadError = true;
      this.loadErrorData = {
        message: 'Workspace and graph must be set in the url.',
        buttonText: 'Back to Multinet',
        href: process.env.VUE_APP_MULTINET_CLIENT,
      };
    }

    this.workspace = workspace;
    this.graph = graph;

    try {
      this.graphStructure = await loadData(workspace, graph, host);
    } catch (error) {
      this.loadError = true;

      // Set error message, button text, and href based on error type
      if (error instanceof DataTooBigError) {
        this.loadErrorData = {
          message: 'Your data is too large to view with this visualization. Please use AQL to reduce the size before you visualize it.',
          buttonText: 'AQL wizard',
          href: `${process.env.VUE_APP_MULTINET_CLIENT}/#/workspaces/${workspace}/aql`,
        };
      } else if (error.status === 404) {
        this.loadErrorData = {
          message: `Network ${this.graph} does not exist.`,
          buttonText: 'Back to multinet',
          href: process.env.VUE_APP_MULTINET_CLIENT,
        };
      } else {
        this.loadErrorData = {
          message: 'There has been an unexpected error.',
          buttonText: 'Back to multinet',
          href: process.env.VUE_APP_MULTINET_CLIENT,
        };
      }

      // Re-throw the error from loadData
      throw error;
    }

    this.provenance = setUpProvenance(this.graphStructure);

    document.addEventListener('keydown', this.keyDownHandler);
  },

  methods: {
    startSimulation() {
      this.$refs.nodelink.startSimulation();
    },

    stopSimulation() {
      this.$refs.nodelink.stopSimulation();
    },

    releaseNodes() {
      this.$refs.nodelink.releaseNodes();
    },

    exportGraph() {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(
        new Blob(
          [JSON.stringify(this.graphStructure)],
          { type: 'text/json' },
        ),
      );
      a.download = 'graph.json';
      a.click();
    },

    keyDownHandler(event) {
      if (
        (event.ctrlKey && event.code === 'KeyZ' && !event.shiftKey) // ctrl + z (no shift)
        || (event.metaKey && event.code === 'KeyZ' && !event.shiftKey) // meta + z (no shift)
      ) {
        undo(this.provenance);
      } else if (
        (event.ctrlKey && event.code === 'KeyY') // ctrl + y
        || (event.ctrlKey && event.code === 'KeyZ' && event.shiftKey) // ctrl + shift + z
        || (event.metaKey && event.code === 'KeyY') // meta + y
        || (event.metaKey && event.code === 'KeyZ' && event.shiftKey) // meta + shift + z
      ) {
        redo(this.provenance);
      }
    },
  },
};
</script>

<template>
  <v-container
    fluid
    class="pt-0 pb-0"
  >
    <v-row class="flex-nowrap">
      <!-- control panel content -->
      <v-col cols="3">
        <v-card id="control">
          <v-card-title class="pb-6">
            MultiNet Node Link Controls
          </v-card-title>

          <v-card-text>
            <v-card-subtitle
              class="pb-0 pl-0"
              style="display: flex; align-items: center; justify-content: space-between"
            >
              Display charts
              <v-switch
                v-model="renderNested"
                class="ma-0"
                hide-details
              />
            </v-card-subtitle>

            <v-divider class="mt-4" />

            <v-card-subtitle class="pb-0 pl-0">
              Marker Size
            </v-card-subtitle>
            <v-slider
              v-model="nodeMarkerSize"
              :min="10"
              :max="100"
              :label="String(nodeMarkerSize)"
              inverse-label
              hide-details
            />

            <v-divider class="mt-4" />

            <v-card-subtitle class="pb-0 pl-0">
              Font Size
            </v-card-subtitle>
            <v-slider
              v-model="nodeFontSize"
              :min="10"
              :max="30"
              :label="String(nodeFontSize)"
              inverse-label
              hide-details
            />

            <v-divider class="mt-4" />

            <v-select
              v-model="labelVariable"
              label="Label Variable"
              :items="variableList"
              :options="variableList"
            />

            <v-divider class="mt-4" />

            <v-select
              v-model="colorVariable"
              label="Color Variable"
              :items="colorVariableList"
              :options="colorVariableList"
            />

            <v-divider class="mt-4" />

            <v-card-subtitle
              class="pb-0 px-0"
              style="display: flex; align-items: center; justify-content: space-between"
            >
              Autoselect neighbors
              <v-switch
                v-model="selectNeighbors"
                class="ma-0"
                hide-details
              />
            </v-card-subtitle>
          </v-card-text>

          <v-card-actions>
            <v-btn
              small
              @click="startSimulation"
            >
              Start Simulation
            </v-btn>
          </v-card-actions>

          <v-card-actions>
            <v-btn
              small
              @click="stopSimulation"
            >
              Stop Simulation
            </v-btn>
          </v-card-actions>

          <v-card-actions>
            <v-btn
              small
              @click="releaseNodes"
            >
              Release Pinned Nodes
            </v-btn>
          </v-card-actions>

          <v-card-actions>
            <v-btn
              small
              @click="exportGraph"
            >
              Export Graph
            </v-btn>
          </v-card-actions>
        </v-card>

        <Legend
          v-if="workspace"
          ref="legend"
          class="mt-4"
          cols="3"
          v-bind="{
            graphStructure,
            provenance,
            nodeColorScale,
            linkColorScale,
            glyphColorScale,
            linkWidthScale,
            multiVariableList,
            linkVariableList,
            nodeAttrScales,
            barVariables,
            glyphVariables,
            widthVariables,
            colorVariables,
          }"
        />
      </v-col>

      <!-- node-link component -->
      <v-col>
        <v-row
          row
          wrap
          class="ma-0 pa-0"
        >
          <v-alert
            type="error"
            :value="loadError"
            prominent
          >
            <v-row align="center">
              <v-col class="grow">
                {{ loadErrorData.message }}
              </v-col>
              <v-col class="shrink">
                <v-btn :href="loadErrorData.href">
                  {{ loadErrorData.buttonText }}
                </v-btn>
              </v-col>
            </v-row>
          </v-alert>

          <node-link
            v-if="workspace"
            ref="nodelink"
            v-bind="{
              graphStructure,
              provenance,
              nodeFontSize,
              selectNeighbors,
              renderNested,
              labelVariable,
              colorVariable,
              barVariables,
              glyphVariables,
              widthVariables,
              colorVariables,
              nodeColorScale,
              linkColorScale,
              glyphColorScale,
              linkWidthScale
            }"
            @restart-simulation="hello()"
          />
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
  #control {
    max-height: calc(33vh - 18px);
    overflow-y: scroll
  }
</style>
