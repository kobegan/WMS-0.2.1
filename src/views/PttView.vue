<template>
    <div class="page-content">
        <form @submit.prevent="addMember">
            <fieldset>
                <legend>多点视频会话</legend>
                <table class="formtable" >
                    <tbody>
                    <tr>
                        <td>成员类型选择:</td>
                        <td>
                            <select v-model="type" required>
                                <option v-for="type in types">{{type}}</option>
                            </select>
                        </td>
                        <template v-if="type == 'webrtc'">
                            <td>成员名称:</td>
                            <td>
                                <input type="text" required v-model="memberName"/>
                            </td>
                        </template>
                        <template v-else-if="type == 'ipc'">
                            <td>RTSP:</td>
                            <td>
                                <input type="text" required v-model="memberName"/>
                            </td>
                        </template>
                        <td>
                            <input type="submit" value="添加" class="clickbutton">
                        </td>

                    <tr v-if="groupMember.length > 0">
                        <td>类型</td>
                        <td>名称</td>
                        <td>ID</td>
                        <td>是否在线</td>
                        <td>是否为发言人</td>
                    </tr>
                    <tr v-for="member,index in groupMember">
                        <td>{{member.type}}</td>
                        <td>{{member.name}}</td>
                        <td>{{member.id}}</td>
                        <td>{{member.online}}</td>
                        <td>{{member.speaker}}</td>
                        <td><a v-if="member.online === false" @click="pttView(member.name, index)">观看</a></td>
                        <td><a v-if="member.speaker === false" @click="setAsSpeaker(member.name,index)">指定为发言人</a></td>
                        <td><a @click="deleteMember(member.name, index)">删除</a></td>
                    </tr>
                    </tbody>
                </table>
            </fieldset>
        </form>
    </div>
</template>

<script>
    import axios from 'axios'
    import trace from "../js/logging"
    export default {
        name: 'ptt-view',
        data () {
            return {
                type: undefined,
                types: ['webrtc'],
//                types: ['ipc','webrtc'],
                groupId: undefined,
                memberName: undefined,
                groupMember: []
            }
        },
        created () {
            let self = this;
            this.groupId = this.$route.params.Id;
            trace('groupId:' + this.groupId);
            axios.get(`/webmedia/ptt/group/members/${this.groupId}`)
                .then( response => {
                    trace(response.data.groupMember);
                    self.groupMember = response.data.groupMember;
                })
                .catch( error => {
                    console.log(error);
                });
        },
        methods: {
            addMember() {
                let self = this;
                trace(this.type);
                trace(this.memberName);

                axios.put(`/webmedia/ptt/group/member/${this.groupId}`, {
                    name: this.memberName,
                    type: this.type,
                })
                    .then( response => {
                        trace(response.data.member, 'addMember');
                        if(response.data.member) {
                            self.groupMember.push(response.data.member);
                        }
                    })
                    .catch( error => {
                        console.log(error);
                    });
                self.type = undefined;
                self.memberName = undefined;
            },
            deleteMember(name, index) {
                trace('deleteMember:' + name);
                axios.delete(`/webmedia/ptt/group/member/${this.groupId}/${name}`)
                    .then(res => {
                        if(res.status === 200) {
                            this.groupMember.splice(index, 1);
                        }
                    })
                    .catch(err => {
                        console.log(err.message);
                    })
            },
            pttView(name, index) {
                trace(name, 'view member');

                axios.post(`/webmedia/ptt/group/member/online/${this.groupId}/${name}`)
                    .then(res => {
                        if(res.status === 200) {
                            this.groupMember[index].online = true;
                            this.$router.push({
                                name: 'multipeer',
                                params: {
                                    groupId: this.groupId,
                                    name: name
                                }
                            });
                        }
                    })
                    .catch(err => {
                        console.log(err.message);
                    })
            },
            setAsSpeaker (name) {
                trace('setAsSpeaker:' + name);
                axios.post(`/webmedia/ptt/endpoint/speaker`, {
                    name: name,
                    groupId: this.groupId,
                })
                    .then( response => {
                        if(response.status === 200) {
                            this.groupMember[index].speaker = true;
                        }
                    })
                    .catch( error => {
                        console.log(error);
                    });
            }
        }
    }
</script>

<style>
    a{ cursor:pointer }
</style>


