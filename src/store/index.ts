import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import { createDirectStore } from 'direct-vuex';

import { Network } from '@/types';
import api from '@/api';
import { GraphSpec, RowsSpec, TableRow } from 'multinet';

Vue.use(Vuex);

export interface State {
  workspaceName: string | null;
  networkName: string | null;
  network: Network | null;
}

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
  } as State,
  getters: {
    workspaceName(state: State): string {
      if (state.workspaceName !== null) {
        return state.workspaceName;
      }
      return '';
    },

    networkName(state: State): string {
      if (state.networkName !== null) {
        return state.networkName;
      }
      return '';
    },

    network(state: State): Network | null {
      if (state.network !== null) {
        return state.network;
      }
      return null;
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
  },
  actions: {
    async fetchNetwork(context, { workspaceName, networkName }) {
      const { commit } = rootActionContext(context);
      commit.setWorkspaceName(workspaceName);
      commit.setNetworkName(networkName);

      // Get all table names
      const networkTables: GraphSpec = await api.graph(workspaceName, networkName);

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
        nodes,
        edges,
      };
      commit.setNetwork(network);
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
