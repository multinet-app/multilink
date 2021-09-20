import Vue from 'vue';
import App from '@/App.vue';
import VueCompositionApi from '@vue/composition-api';
import vuetify from '@/plugins/vuetify';
import api from '@/api';
import oauthClient from '@/oauth';

Vue.config.productionTip = false;
Vue.use(VueCompositionApi);

oauthClient.maybeRestoreLogin().then(() => {
  Object.assign(api.axios.defaults.headers.common, oauthClient.authHeaders);

  new Vue({
    vuetify,
    render: (h) => h(App),
  }).$mount('#app');
});
