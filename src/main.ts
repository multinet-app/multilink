import Vue from 'vue';
import App from '@/App.vue';
import vuetify from '@/plugins/vuetify';
import api from '@/api';
import oauthClient from '@/oauth';
import { createPinia, PiniaVuePlugin } from 'pinia';

Vue.config.productionTip = false;

Vue.use(PiniaVuePlugin);
const pinia = createPinia();

oauthClient.maybeRestoreLogin().then(() => {
  Object.assign(api.axios.defaults.headers.common, oauthClient.authHeaders);

  new Vue({
    vuetify,
    pinia,
    render: (h) => h(App),
  }).$mount('#app');
});
