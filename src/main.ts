import Vue from 'vue';
import App from '@/App.vue';
import vuetify from '@/plugins/vuetify';
import api from '@/api';
import oauthClient from '@/oauth';
import { oauthClientId, prodBuild } from '@/environment';
import { createPinia, PiniaVuePlugin } from 'pinia';
import { readSharedLoginCookie } from 'multinet';

Vue.config.productionTip = false;

Vue.use(PiniaVuePlugin);
const pinia = createPinia();

const key = `oauth-token-${oauthClientId}`;
const sharedLoginCookie = readSharedLoginCookie();
if (prodBuild) {
  if (sharedLoginCookie) {
    localStorage.setItem(key, sharedLoginCookie);
  } else {
    localStorage.removeItem(key);
  }
}

oauthClient.maybeRestoreLogin().then(() => {
  Object.assign(api.axios.defaults.headers.common, oauthClient.authHeaders);

  new Vue({
    vuetify,
    pinia,
    render: (h) => h(App),
  }).$mount('#app');
});
