<template>
    <div id = "callPage" class = "call-page">
        <video id = "remoteVideo" autoplay controls="controls"></video>
        <audio id="remoteAudio" autoplay controls></audio>

        <div class = "row text-center">
            <div class = "col-md-12">
<!--                <label>
                    <input type="checkbox" v-model="videoCheck" value="video"/>
                    接收视频</label><br>
                <label>
                    <input type="checkbox" v-model="audioCheck" value="audio"/>
                    接收音频</label><br>
                <button id = "callBtn" class = "btn-success btn" @click="createOffer">Call</button>-->
                <button id = "hangUpBtn" class = "btn-danger btn" @click="handUp">Hang Up</button>
            </div>
        </div>

    </div>
</template>

<script>
    /*import httpws from '@/js/httpws/httpws'*/
    import webStreamer from '@/js/webStreamer/webStreamer'
    import axios from 'axios'
    import trace from '@/js/logging'
    import 'webrtc-adapter'
    export default {
      name: 'meeting-view',
      data() {
        return {
          streamId: 0,
          peer_connection: null,
          endpoint_id: null,
          videoCheck: false,
          audioCheck: false,
          signalingBridge: null,
          localStream: null,
          remoteVideo: null,
          remoteAudio: null,
          callBtn: null,
          webStreamerClient: null
        }
      },
      beforeRouteEnter (to, from, next) {
        trace('beforeRouteEnter', 'single');
        trace(from, 'from');
        trace(to, 'to');

        next();
      },
      beforeRouteLeave (to, from, next) {
        trace('beforeRouteLeave', 'single');
        trace(from, 'from');
        trace(to, 'to');

        this.handUp(next);
        //next();
      },
      beforeDestroy () {
        trace('beforeDestroy', 'single');
      },
      destroyed () {
        trace('destroyed', 'single');
      },
      mounted() {
          let self = this;
        this.callBtn = document.getElementById('callBtn');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.remoteAudio= document.getElementById('remoteAudio');
        this.remoteVideo.addEventListener('loadedmetadata', function() {
          trace('Remote video videoWidth: ' + this.videoWidth +
            'px,  videoHeight: ' + this.videoHeight + 'px');
          self.remoteVideo.volume = 1.0;
        });

        this.remoteAudio.addEventListener('loadedmetadata', function() {
          trace('Remote audio volume: ' + this.volume);
        });

        //this.callBtn.disabled = true;
      },
      created() {
        this.endpoint_id = Math.floor(Math.random()*10000);
        console.log('creatd endpoint_id: ' + this.endpoint_id);
        this.streamId = this.$route.params.Id;

        if(this.viewerId === undefined) {

        }

        axios.post(`/webmedia/livestream/viewer`, {
          type: 'webrtc',
          Id: this.streamId,
          video: 'recvonly',
          audio: 'recvonly',
        })
          .then( response => {
            trace(response, 'beforeCreate');
            let data = response.data;
            console.log(data);
            this.connectionId = data.viewerId;
            this.signalingBridge = data.signalingBridge;
            this.createClientServer();
          })
          .catch( error => {
            console.log(error);
            trace(error.message, 'beforeCreate');
          });
      },
      methods: {
        request(msgObj, method, path) {
          this.webStreamerClient.request({
            method: method,
            path: path,
            body: JSON.stringify(msgObj)
          });
        },
        subscribe() {
          //this.subscribeBtn.disabled = true;
          let postObj = {
            endpoint: [{
              type: 'answerer',
              connection: this.connectionId.toString(),
              topic: ['sdp', 'status']
            }],
            notify_addr: `endpoint${this.endpoint_id}`
          };
          let self = this;

          this.request(postObj, 'POST', '/webrtc/subscription');
          trace('subscribe successfully');
          postObj = {
            endpoint: {
              type: 'offerer',
              connection: self.connectionId.toString()
            },
            message: {
              status: 'connecting'
            }
          };
          this.request(postObj, 'PUT', '/webrtc/push');
/*            .then( res => {
              trace('subscribe successfully');
              let msgObj = {
                endpoint: {
                  type: 'offerer',
                  connection: self.connectionId.toString()
                },
                message: {
                  status: 'connecting'
                }
              };
              self.request(msgObj, 'PUT', '/webrtc/push');
            })
            .catch( err => {
              trace(err.message);
            });*/
        },
        createClientServer() {
          let self = this;
          trace(self.signalingBridge, 'signalingBridge:');

          this.webStreamerClient = webStreamer.createClientServer( reqRes => {
            trace('createClientServer:');
            trace(reqRes);
            if(reqRes.header.request) {
              self.notificationHandler(reqRes.body);
            } else {

            }
          }).connect(`${this.signalingBridge}/endpoint${this.endpoint_id}`).on('onconnect', () => {
            trace('signalingBridge connected!' + this.signalingBridge + ',' + this.endpoint_id);
            this.handleJoin();
            this.subscribe();
          });
        },
        notificationHandler(msg) {
          console.log('notificationHandler:\r\n' + msg);
          let data;
          try {
            data = JSON.parse(msg);
          } catch(err) {
            console.log(err.message);
            throw err;
          }
          if(data.message.status === 'connecting') {
            trace('connecting');
/*            if(this.peer_connection) {
              this.createOffer();
            }*/
          }
          if(data.message.sdp !== undefined) {
            switch(data.message.sdp.type) {
              case "offer":
                this.handleOffer(data.message.sdp);
                break;
              case "answer":
                this.handleAnswer(data.message.sdp);
                break;
              case "leave":
                this.handleLeave();
                break;
              default:
                break;
            }
            if(data.message.sdp.candidate) {
              this.handleCandidate(data.message.sdp);
            }
          }
        },
        handleJoin() {
          trace('RTCPeerConnection created');

          this.peer_connection = new RTCPeerConnection();


          let self = this,
            audioSource = localStorage.getItem('audioInput');
          console.log('audioSource:' + audioSource);

          let constraints = {
            audio: {deviceId: audioSource ? {exact: audioSource} : undefined}
          };

          trace('Requesting local stream');
          navigator.mediaDevices.getUserMedia(constraints)
            .then(mediaHandler.bind(self))
            .catch(function(e) {
              alert('getUserMedia() error: ' + e.name);
            });

          function mediaHandler(myStream) {
            trace('Received local stream');
            //displaying local video stream on the page
            this.localStream = myStream;

            this.localStream.getTracks().forEach(
              function(track) {
                self.peer_connection.addTrack(
                  track,
                  self.localStream
                );

                if(self.peer_connection) {
                  self.createOffer();
                }
              });
          }


          //setup stream listening
//                    this.peer_connection.addStream(myStream);

          /*                    let tracksNum = this.localStream.getTracks().length;
           trace('trackNum: ' + tracksNum);
           for(let i = 0; i < tracksNum; ++i) {
           this.peer_connection.addTrack( this.localStream.getTracks()[i], this.localStream);
           }*/
          /*                    this.localStream.getTracks().forEach(
           function(track) {
           self.peer_connection.addTrack(
           track,
           self.localStream
           );
           });*/


          //when a remote user adds a stream to the peer connection, we display it
          this.peer_connection.onaddstream = (e) => {
              trace('onaddstream');
              console.log(e);
              document.querySelector('#remoteVideo').srcObject = e.stream;
           };


          //when a remote user adds a stream to the peer connection, we display it
          // this.peer_connection.onaddstream = (e) => {
          //     trace('onaddstream');
          //     console.log(e);
          //     document.querySelector('#remoteVideo').srcObject = e.stream;
          // };

/*          this.peer_connection.ontrack = (e) => {
            trace('ontrack');
            console.log(e);

            if(e.track.kind === 'audio') {
              if (self.remoteAudio.srcObject !== e.streams[0]) {
                self.remoteAudio.srcObject = e.streams[0];
                trace('received remote audio stream');
              }
            }
            if(e.track.kind === 'video') {
              if (self.remoteVideo.srcObject !== e.streams[0]) {
                self.remoteVideo.srcObject = e.streams[0];
                trace('received remote video stream');
              }
            }

          };*/

          // Setup ice handling
          this.peer_connection.onicecandidate = function (event) {
            if (event.candidate) {
              let msgObj = {
                endpoint: {
                  type: 'offerer',
                  connection: self.connectionId.toString()
                },
                message: {
                  sdp: event.candidate
                }
              };
              trace('===========send candidate===========');
              self.request(msgObj, 'PUT', '/webrtc/push');
            }

          };

          this.peer_connection.oniceconnectionstatechange = function (event) {
            if(this.peer_connection) {
              trace('ICE state: ' + this.peer_connection.iceConnectionState);
              console.log('ICE state change event: ', event);
            }
          }.bind(this);
        },
        handleOffer(offer) {
          trace('handleOffer:');
          let self = this;
          trace('setRemoteDescription start');
          self.peer_connection.setRemoteDescription(offer).then(
            () => {
              trace('setRemoteDescription complete');
              trace('createAnswer start');
              self.peer_connection.createAnswer().then(
                onCreateAnswerSuccess,
                () => {
                  trace('Failed to create session description: ' + error.toString());
                }
              );
            },
            error => {
              trace('Failed to set session description: ' + error.toString());
            }
          );

          function onCreateAnswerSuccess(answer) {
            self.peer_connection.setLocalDescription(answer);
            trace('answer sdp: ' + answer.sdp);
            let msgObj = {
              endpoint: {
                type: 'offerer',
                connection: self.connectionId.toString()
              },
              message: {
                sdp: answer,
                status: 'connected'
              }
            };
            self.request(msgObj, 'PUT', '/webrtc/push');
          }
        },
        //when we got an answer from a remote user
        handleAnswer(answer) {
          answer.sdp = this.forceChosenAudioCodec(answer.sdp);
          trace('handleAnswer:', answer.sdp);
          this.peer_connection.setRemoteDescription(answer);

          let msgObj = {
            endpoint: {
              type: 'offerer',
              connection: this.connectionId.toString()
            },
            message: {
              status: 'connected'
            }
          };
          this.request(msgObj, 'PUT', '/webrtc/push');
        },
        //when we got an ice candidate from a remote user
        handleCandidate(candidate) {
          trace('handleCandidate:');
          this.peer_connection.addIceCandidate(candidate).catch(e => trace(e));
        },
        createOffer() {
          let offerOptions;

          let medieType = localStorage.getItem('mediaType');

          switch (medieType.toString()){
            case '0':
              offerOptions = {
                offerToReceiveAudio: 0,
                offerToReceiveVideo: 1
              };
              break;
            case '1':
              offerOptions = {
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 0
              };
              break;
            case '2':
              offerOptions = {
                offerToReceiveAudio: 1,
                offerToReceiveVideo: 1
              };
              break;
          }
          let self = this;

          trace('createOffer start', JSON.stringify(offerOptions));
          self.peer_connection.createOffer(
            offerOptions
          ).then(
            onCreateOfferSuccess,
            error => {
              trace('Failed to create session description: ' + error.toString());
            }
          );

          function onCreateOfferSuccess(desc) {
            trace('setLocalDescription start');
            //self.callBtn.disabled = true;


            self.peer_connection.setLocalDescription(desc).then(
              function() {
                trace('setLocalDescription complete\n');
                trace('offer sdp 1: ' + desc.sdp);

                if(medieType !== 0) {
                  desc.sdp = self.forceChosenAudioCodec(desc.sdp);
                  trace('offer sdp 2: ' + desc.sdp);
                }

                let msgObj = {
                  endpoint: {
                    type: 'offerer',
                    connection: self.connectionId.toString()
                  },
                  message: {
                    sdp: desc
                  }
                };
                self.request(msgObj, 'PUT', '/webrtc/push');
              },
              error => {
                trace('Failed to set session description: ' + error.toString());
              }
            );
          }
        },
        forceChosenAudioCodec(sdp) {
          let audiocodec = localStorage.getItem('audioCodec');
          console.log(`audiocodec: ${audiocodec}`);

          return this.maybePreferCodec(sdp, 'audio', 'send', audiocodec);
        },
        maybePreferCodec(sdp, type, dir, codec) {
          let str = type + ' ' + dir + ' codec';
          if (codec === '') {
            trace('No preference on ' + str + '.');
            return sdp;
          }

          trace('Prefer ' + str + ': ' + codec);

          let sdpLines = sdp.split('\r\n');

          // Search for m line.
          let mLineIndex = this.findLine(sdpLines, 'm=', type);
          if (mLineIndex === null) {
            return sdp;
          }

          // If the codec is available, set it as the default in m line.
          let codecIndex = this.findLine(sdpLines, 'a=rtpmap', codec);
          console.log('codecIndex', codecIndex);
          if (codecIndex) {
            let payload = this.getCodecPayloadType(sdpLines[codecIndex]);
            if (payload) {
              sdpLines[mLineIndex] = this.setDefaultCodec(sdpLines[mLineIndex], payload);
            }
          }

          sdp = sdpLines.join('\r\n');
          return sdp;
        },
        findLine(sdpLines, prefix, substr) {
          return this.findLineInRange(sdpLines, 0, -1, prefix, substr);
        },
        // Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
        // and, if specified, contains |substr| (case-insensitive search).
        findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
          let realEndLine = endLine !== -1 ? endLine : sdpLines.length;
          for (let i = startLine; i < realEndLine; ++i) {
            if (sdpLines[i].indexOf(prefix) === 0) {
              if (!substr ||
                sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
                return i;
              }
            }
          }
          return null;
        },
        // Gets the codec payload type from an a=rtpmap:X line.
        getCodecPayloadType(sdpLine) {
          let pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
          let result = sdpLine.match(pattern);
          return (result && result.length === 2) ? result[1] : null;
        },
        // Returns a new m= line with the specified codec as the first one.
        setDefaultCodec(mLine, payload) {
          let elements = mLine.split(' ');

          // Just copy the first three parameters; codec order starts on fourth.
          let newLine = elements.slice(0, 3);

          // Put target payload first and copy in the rest.
          newLine.push(payload);
          for (let i = 3; i < elements.length; i++) {
            if (elements[i] !== payload) {
              newLine.push(elements[i]);
            }
          }
          return newLine.join(' ');
        },
        handUp(next) {
          if(this.peer_connection === null) {
            if(next && typeof next === 'function') {
              next();
            }
            return;
          }
          let postObj = {
            endpoint: [{
              type: 'answerer',
              connection: this.connectionId.toString(),
              topic: ['sdp', 'status']
            }],
            notify_addr: `endpoint${this.endpoint_id}`
          };

          this.request(postObj, 'DELETE', '/webrtc/subscription');
          this.handleLeave(next);
        },
        handleLeave(next) {
          document.querySelector('#remoteVideo').srcObject = null;

          axios.delete(`/webmedia/livestream/viewer`, {
            data: {
              viewerId: this.connectionId,
              streamId: this.streamId
            }
          })
            .catch(err => {
              console.log(err.message);
            });

          if(this.peer_connection) {
            this.peer_connection.close();
            this.peer_connection = null;
          }
          if(this.webStreamerClient) {
            this.webStreamerClient.close();
            this.webStreamerClient = null;
          }
          if(next && typeof next === 'function') {
            next();
          }
        }
      }
    }
</script>

<style scoped>
    body {
        background: #eee;
        padding: 5% 0;
    }

    video {
        background: black;
        border: 1px solid gray;
    }

    .call-page {
        position: relative;
        display: block;
        margin: 0 auto;
        width: 500px;
        height: 500px;
    }

    #remoteVideo {
        width: 500px;
        height: 500px;
    }

    .btn-success {
        color: #fff;
        background-color: #5cb85c;
        border-color: #4cae4c;
    }
    .btn-success:focus,
    .btn-success.focus {
        color: #fff;
        background-color: #449d44;
        border-color: #255625;
    }
    .btn-success:hover {
        color: #fff;
        background-color: #449d44;
        border-color: #398439;
    }

    .btn-danger {
        color: #fff;
        background-color: #d9534f;
        border-color: #d43f3a;
    }
    .btn-danger:focus,
    .btn-danger.focus {
        color: #fff;
        background-color: #c9302c;
        border-color: #761c19;
    }
    .btn-danger:hover {
        color: #fff;
        background-color: #c9302c;
        border-color: #ac2925;
    }
</style>
