<template>
    <div class="page-content">
        <div class="content-nav">
            会话管理 &gt; 创建视频会话
        </div>
        <form @submit.prevent="createSession" @reset.prevent="resetSession">
            <fieldset>
                <legend>会话信息</legend>
                <table class="formtable">
                    <tbody>
                    <tr>
                        <td>类型:</td>
                        <td>
                            <select v-model="choosenSessionType" id="sessionSelector" >
                                <option v-for="type, index in meetingType" :value="index">{{type}}</option>
                            </select>
                        </td>
                    </tr>
                    <template v-if="choosenSessionType === 0">
                        <tr>
                            <td>视频流地址:</td>
                            <td>
                                <input type="text" v-model="streamUrl" required placeholder="rtsp://*/id=*">
                            </td>

                        </tr>
                      <tr>
                        <td>接收媒体类型:</td>
                        <td>
                          <select v-model="choosenMediaType" id="mediaSelector2" required>
                            <option v-for="type, index in pttMediaType"  :value="index">{{type}}</option>
                          </select>
                        </td>
                      </tr>
                       <template v-if="choosenMediaType == 0 || choosenMediaType == 2">
                        <tr>
                          <td>Video编码:</td>
                          <td>
                            <select v-model="choosenCodec" id="CodecSelector" required>
                              <option v-for="type, index in codec"  :value="index">{{type}}</option>
                            </select>
                          </td>
                        </tr>
                       </template>

                       <template v-if="choosenMediaType == 1 || choosenMediaType == 2">
                        <tr>
                          <td>Audio编码:</td>
                          <td>
                            <select v-model="choosenAudioCodec" id="AudioCodecSelector" required>
                              <option v-for="type, index in audioCodec"  :value="index">{{type}}</option>
                            </select>
                          </td>
                        </tr>
                         <tr>
                           <td>Audio input source:</td>
                           <td>
                             <select v-model="chosenAudioInput" id="audioSource" required>
                               <option v-for="obj, index in audioInputSource" :value="obj.value">{{obj.label}}</option>
                             </select>
                           </td>
                         </tr>
                       </template>
<!--                        <tr>
                            <td>Video:</td>
                            <td>
                                <input type="checkbox" v-model="video"/>
                            </td>
                        </tr>
                        <tr>
                            <td>Audio:</td>
                            <td>
                                <input type="checkbox" v-model="audio"/>
                            </td>
                        </tr>-->
                    </template>

                    <template v-if="choosenSessionType === 1">
                      <tr>
                        <td>媒体类型:</td>
                        <td>
                          <select v-model="choosenMediaType" id="mediaSelector" required>
                            <option v-for="type, index in pttMediaType"  :value="index">{{type}}</option>
                          </select>
                        </td>
                      </tr>
<!--                        <tr>
                            <td>会话主题:</td>
                            <td>
                                <input id="capacity" type="text" v-model="meetingname" placeholder="例如：流媒体" maxlength="20">
                            </td>
                        </tr>

                        <tr>
                            <td>备注：</td>
                            <td>
                                <textarea id="description" v-model="description"  maxlength="200" rows="5" cols="60" placeholder="200字以内的文字描述"></textarea>
                            </td>
                        </tr>-->
                    </template>

                    <tr>
                        <td colspan="2" class="command">
                            <input type="submit" value="创建" class="clickbutton">
                            <input type="reset" value="重置" class="clickbutton">
                        </td>
                    </tr>
                    </tbody>
                </table>
            </fieldset>
        </form>
    </div>
</template>

<script>
    import axios from 'axios'
    import trace from "../js/logging";
    import 'webrtc-adapter'
    export default  {
        name: 'create-meeting-content',
     data () {
            return {
                meetingname: '',
                description: '',
                groupId: 0,
                meetingType: ['单点视频会话', '多点视频会话', '网页1对1视频会话'],
//                meetingType: ['单点视频会话', '多点视频会话'],
                pttMediaType: ['视频', '音频', '音视频'],
                codec: ['h264', 'h265'],
                audioCodec: ['pcma', 'opus'],
                //meetingType: ['单点视频会话','多点视频会话'],
                choosenSessionType: undefined,
                choosenMediaType: 0,
                choosenCodec: 0,
                choosenAudioCodec: 0,
                streamUrl: '',
                audio: false,
                video: true,
              audioInputSource: [],
              chosenAudioInput: undefined
            }
        },
        beforeRouteEnter (to, from, next) {
            trace('beforeRouteEnter', 'create');
            trace(from, 'beforeRouteEnter from');
            trace(to, 'beforeRouteEnter to');
            next();
        },
        beforeRouteLeave (to, from, next) {
            trace('beforeRouteLeave', 'create');
            trace(from, 'beforeRouteLeave from');
            trace(to, 'beforeRouteLeave to');
            console.log('choosenAudioCodec new:' + this.audioCodec[this.choosenAudioCodec].toUpperCase());
            localStorage.setItem('audioCodec', this.audioCodec[this.choosenAudioCodec].toUpperCase());

          console.log('choosenMediaType new:' + this.choosenMediaType);
          localStorage.setItem('mediaType', this.choosenMediaType);
            next();
        },
        beforeDestroy () {
            trace('Create beforeDestroy');
        },
        destroyed () {
            trace('Create destroyed');
        },
        beforeCreate () {
            trace('beforeCreate');

        },
      mounted () {
            trace('mounted');
        this.updateDeviceList();
        navigator.mediaDevices.ondevicechange = function(event) {
          this.updateDeviceList();
        }
        },
        watch: {
          choosenMediaType: function (val, oldVal) {
              console.log('choosenMediaType new:' + val);
            localStorage.setItem('mediaType', val);
          },
          choosenAudioCodec: function (val, oldVal) {
            console.log('choosenAudioCodec new:' + this.audioCodec[val].toUpperCase());
            localStorage.setItem('audioCodec', val);
          },
          chosenAudioInput: function (val, oldVal) {
            console.log('chosenAudioInput new:' + val);
            localStorage.setItem('audioInput', val);
          }
        },

        methods: {
            createSession() {
                if(this.choosenSessionType === undefined) {
                    alert('请选择要创建的视频会话类型');
                    return;
                }
                let meetingType = '';
                switch (this.choosenSessionType)  {
                    case 0:
                        meetingType = 'single';
                        this.singlePointHandler(meetingType);
                        break;
                    case 1:
                        meetingType = 'multi';
                        this.pttHandler(meetingType);
                        break;
                    case 2:
                        meetingType = 'peertopeer';
                        this.oneononeHandler(meetingType);
                        break;
                    default:
                        break;
                }
            },
          updateDeviceList() {
            let self = this;

            navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

            function gotDevices(deviceInfos) {
              // Handles being called several times to update labels. Preserve values.
              self.audioInputSource.length = 0;
              for (let i = 0; i !== deviceInfos.length; ++i) {
                  console.dir(deviceInfos[i]);
                let deviceInfo = deviceInfos[i];
                let option = document.createElement('option');
                option.value = deviceInfo.deviceId;
                let obj = {};
                if (deviceInfo.kind === 'audioinput') {
                    obj.label = deviceInfo.label;
                  obj.value = deviceInfo.deviceId;
                  self.audioInputSource.push(obj);
                /*} else if (deviceInfo.kind === 'audiooutput') {
                  option.text = deviceInfo.label || 'speaker ' +
                    (audioOutputSelect.length + 1);
                  audioOutputSelect.appendChild(option);
                } else if (deviceInfo.kind === 'videoinput') {
                  option.text = deviceInfo.label || 'camera ' + (videoSelect.length + 1);
                  videoSelect.appendChild(option);*/
                } else {
                  console.log('Some other kind of source/device: ', deviceInfo);
                }
              }
  /*            self.selectors.forEach(function(select, selectorIndex) {
                if (Array.prototype.slice.call(select.childNodes).some(function(n) {
                    return n.value === values[selectorIndex];
                  })) {
                  select.value = values[selectorIndex];
                }
              });*/
            }

            function handleError(error) {
              console.log('navigator.getUserMedia error: ', error);
            }
          },
            oneononeHandler(meetingType) {
                let self = this;
                axios.post('/webmedia/livestream', {
                    source: {
                        type: 'webrtc',
                        options: {
                            webrtc: {
                                audio: 'sendrecv',
                                video: 'sendrecv'
                            }
                        }
                    }
                })
                    .then(res => {
                        let data = res.data;

                        self.$router.push({
                            name: `${meetingType}`,
                            params: {
                                Id: data.connectionId
                            }
                        });

                        data = {
                            connectionId: data.connectionId,
                            sessionType: meetingType,
                            title: undefined,
                            desc: undefined
                        };
                        axios.put('/webmedia/sessionInfo', data);
                    })
                    .catch(err => {
                        trace(err.message);
                    })
            },
            singlePointHandler(meetingType) {
                let self = this;
                axios.post('/webmedia/livestream', {
                    source: {
                        type: 'rtsp',
                        options: {
                            rtsp: {
                                url: this.streamUrl,
                                codec: this.codec[this.choosenCodec],
                                audioCodec: this.audioCodec[this.choosenAudioCodec]
                            }
                        }
                    }
                })
                    .then( response => {
                        trace(response, 'singlePointHandler');
                        let data = response.data;

                        self.$router.push({
                            name: `${meetingType}`,
                            params: {
                                Id: data.streamId
                            }
                        });

                        data = {
                            connectionId: data.streamId,
                            sessionType: meetingType,
                            title: undefined,
                            desc: undefined
                        };
                        axios.put('/webmedia/sessionInfo', data);
                    })
                    .catch( error => {
                        trace(error, 'singlePointHandler');
                    });
            },
            pttHandler(meetingType) {
                let self = this;

                axios.post('/webmedia/ptt/group', {
                    title: this.meetingname,
                    desc: this.description
                })
                    .then( response => {
                        let data = response.data;
                        trace(data);
                        self.$router.push({
                            name: `${meetingType}`,
                            params: {Id: data.groupId}
                        });
                    })
                    .catch( error => {
                        console.log(error.message);
                    });
            },
            resetSession() {
                this.choosenSessionType = undefined;
            }
        }
    }
</script>

<style scoped>
    .page-content{
        width:830px;
        float:right;
    }
    .page-content .content-nav{
        padding:0 0 10px 0;
    }
</style>
