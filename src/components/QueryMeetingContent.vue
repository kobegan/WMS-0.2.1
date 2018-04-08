<template>
    <div class="page-content">
        <div class="content-nav">
            会话管理 &gt; 查看会话
        </div>
        <table class="listtable">
            <caption>所有会话:</caption>
            <tbody>
            <tr class="listheader">
                <th>会话类型</th>
                <th>会话ID</th>
                <th>操作</th>
                <th>操作</th>
            </tr>
            <tr v-for="(info, index) in sessionInfo">
                <td>{{info.sessionType}}</td>
                <td>{{info.connectionId}}</td>
                <td>
                    <router-link :to="{ name: info.sessionType, params: { Id: info.connectionId }}">进入会话</router-link>
                </td>
                <td>
                    <a @click="deleteSession(index)">删除会话</a>
                </td>
            </tr>
            </tbody></table>
    </div>
</template>

<script>
    import axios from 'axios'
    import trace from "../js/logging";
    export default {
        name: 'query-meeting-content',
        data () {
            return {
                sessionInfo: []
            }
        },
        beforeRouteEnter(to, from, next) {
            trace('beforeRouteEnter', 'query');
            trace(from, 'from');
            trace(to, 'to');
            axios.get(`/webmedia/sessionInfo`)
                .then( response => {
                    next( vm => {
                        trace("query:\r\n");
                        trace(response.data);
                        vm.sessionInfo = response.data.sessionInfo;
                    });
                })
                .catch( error => {
                    console.log(error);
                });
        },
        methods: {
            deleteSession(index) {
                trace(index,'deleteSession');
                let connectionId = this.sessionInfo[index].connectionId,
                    sessionType = this.sessionInfo[index].sessionType,
                    path;
                trace(connectionId,'deleteSession');
                switch(sessionType) {
                    case 'single': {
                        path = '/webmedia/livestream';
                        break;
                    }
                    case 'multi': {
                        path = '/webmedia/ptt/group';
                        break;
                    }
                }
                axios.delete(path, {
                    data: {
                        Id: connectionId
                    }
                })
                    .then( res => {
                        trace('delete session ok');
                        this.sessionInfo.splice(index, 1);
                        axios.delete('/webmedia/sessionInfo', {
                            data: {
                                sessionId: connectionId
                            }
                        });
                    })
                    .catch( err => {
                        trace(err.message, 'deleteSession');
                    })

            }
        }

    }
</script>

<style scoped>
/*    .page-content{
        width:830px;
        float:right;
    }
    .page-content .content-nav{
        padding:0 0 10px 0;
    }*/
</style>
