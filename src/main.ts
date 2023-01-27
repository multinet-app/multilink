import Vue from 'vue';
import App from '@/App.vue';
import vuetify from '@/plugins/vuetify';
import api from '@/api';
import oauthClient from '@/oauth';
import { oauthClientId, prodBuild } from '@/environment';
import { createPinia, PiniaVuePlugin } from 'pinia';

Vue.config.productionTip = false;

Vue.use(PiniaVuePlugin);
const pinia = createPinia();

const key = `oauth-token-${oauthClientId}`;
const sharedLoginCookie = document.cookie.split('; ').find((c) => c.startsWith('sharedLogin='));
if (prodBuild) {
  if (localStorage.getItem(key) === null && sharedLoginCookie) {
    localStorage.setItem(key, sharedLoginCookie.split('=')[1]);
  } else if (!sharedLoginCookie) {
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
