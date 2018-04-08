import axios  from 'axios'

const state = {
    peerConnectionSignalingServerPair: {},
    sessionInfo: [],
};

// 创建一个对象存储一系列我们接下来要写的 mutation 函数
const mutations = {
    setPeerConnectionSignalingServer (state, payload) {
        console.log("payload.signalingServer:\r\n");
        console.log(payload.connectionId);
        console.log(payload.signalingBridge);
        state.sessionInfo.push({
            connectionId: payload.connectionId,
            sessionType: payload.sessionType
        });
        state.peerConnectionSignalingServerPair[payload.connectionId] = payload.signalingBridge;
    }
};

// 创建一个对象存储一系列我们接下来要写的 actions 函数
const actions = {
    getSignalingServer ({ commit }, payload) {
/*        return new Promise((resolve, reject) => {
            axios.get('/webmedia/')
                .then(res => {
                    console.log(res.data);
/!*                    commit({
                        type: 'setpeerConnectionSignalingServer',
                        signalingServer: res.data.signalingServer
                    });
                    resolve(res)*!/
                }, err => {
                    reject(err)
                });
        })*/
    }
};

const getters = {
    getPeerConnectionSignalingServer: (state, getters) => {
        return state.peerConnectionSignalingServerPair
    },
    getSessionInfo: (state, getters) => {
        return state.sessionInfo;
    }
};

export default {
    state,
    mutations,
    actions,
    getters
}
