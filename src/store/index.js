import Vue from 'vue'
import Vuex from 'vuex'

import signalingServer from './modules/signalingServer'

Vue.use(Vuex);

let store = new Vuex.Store({
    modules: {
        signalingServer
    }
});

store.dispatch({
    type: 'getSignalingServer'
});

export default store
