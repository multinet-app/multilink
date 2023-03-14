import Vue from 'vue';
import App from '@/App.vue';
import vuetify from '@/plugins/vuetify';
import api from '@/api';
import oauthClient from '@/oauth';
import { oauthClientId, prodBuild } from '@/environment';
import { createPinia, PiniaVuePlugin } from 'pinia';
import { invalidateSharedLoginCookie, readSharedLoginCookie, writeSharedLoginCookie } from 'multinet';

Vue.config.productionTip = false;
Vue.use(PiniaVuePlugin);
const pinia = createPinia();

const loginTokenKey = `oauth-token-${oauthClientId}`;
const sharedLoginCookie = readSharedLoginCookie();
if (prodBuild && sharedLoginCookie !== null) {
  localStorage.setItem(loginTokenKey, sharedLoginCookie);
}

oauthClient.maybeRestoreLogin().then(() => {
  Object.assign(api.axios.defaults.headers.common, oauthClient.authHeaders);

  // If logged out, remove the local storage item
  if (!Object.keys(oauthClient.authHeaders).includes('Authorization')) {
    localStorage.removeItem(loginTokenKey);
  }

  const tokenString = localStorage.getItem(loginTokenKey);
  if (tokenString !== null) {
    writeSharedLoginCookie(tokenString);
  } else {
    invalidateSharedLoginCookie();
  }

  new Vue({
    vuetify,
    pinia,
    render: (h) => h(App),
  }).$mount('#app');
});
