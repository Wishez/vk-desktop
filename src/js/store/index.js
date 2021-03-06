import Vue from 'vue';
import Vuex from 'vuex';
import { settings, users } from './Storage';
import rootModule from './modules/index';

Vue.use(Vuex);

const modules = {};
const moduleNames = [
  'messages',
  'settings',
  'users'
];

for(const name of moduleNames) {
  modules[name] = Object.assign(require(`./modules/${name}`).default, {
    namespaced: true
  });
}

const store = new Vuex.Store({ ...rootModule, modules });

store.subscribe(({ type }, store) => {
  if(/^settings\//.test(type)) settings.update(store.settings);
  if(/^users\//.test(type)) users.update(store.users);
});

export default store;
