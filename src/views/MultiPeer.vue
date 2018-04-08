<template>
    <div id = "callPage" class = "call-page">
        <h1>PTT多点视频会话</h1>
        <video id = "localVideo" autoplay controls></video>

        <video id = "remoteVideo" autoplay controls></video>

        <div class = "row text-center">
<!--            <select v-model="type">
                <option v-for="type in endpointTypes">{{type}}</option>
            </select>
            <button id = "subscribeBtn" class = "btn-success btn" @click="subscribe">Subscribe</button>
            <br>-->
            <br>
            <div class = "col-md-12">
                <button id = "callBtn" class = "btn-success btn" @click="becomeSpeaker">BecomeSpeaker</button>
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
                connectionId: 0,
                peer_connection: null,
                endpoint: null,
                localStream: null,
                localVideo: null,
                remoteVideo: null,
                signalingBridge: null,
                endpointTypes: ['offerer','answerer'],
                type: 'offerer',
                endpoint_id: null,
                callBtn: null,
                subscribeBtn: null,
                webStreamerClient: null
            }
        },
        beforeRouteLeave (to, from, next) {
            trace('beforeRouteLeave', 'MultiPeer');
            trace(from, 'from');
            trace(to, 'to');

            this.handUp(next);
            //next();
        },
        mounted() {
            this.callBtn = document.getElementById('callBtn');
            this.subscribeBtn = document.getElementById('subscribeBtn');
            this.localVideo = document.getElementById('localVideo');
            this.remoteVideo = document.getElementById('remoteVideo');
            this.localVideo.addEventListener('loadedmetadata', function() {
                trace('Local video videoWidth: ' + this.videoWidth +
                    'px,  videoHeight: ' + this.videoHeight + 'px');
            });
            this.remoteVideo.addEventListener('loadedmetadata', function() {
                trace('Remote video videoWidth: ' + this.videoWidth +
                    'px,  videoHeight: ' + this.videoHeight + 'px');
            });

            //this.callBtn.disabled = true;
        },
        created() {
            this.endpoint_id = Math.floor(Math.random()*10000);
            this.groupId = this.$route.params.groupId;
            trace(this.groupId, 'multi ptt groupId');
            this.name = this.$route.params.name;
            trace(this.name, 'multi ptt name');

            this.createEndpoint();
        },
        methods: {
            createEndpoint() {
                axios.post(`/webmedia/ptt/group/endpoint`, {
                    groupId: this.groupId,
                    endpoint: [{
                        name: this.name,
                        type: 'webrtc',
                        options: {
                            webrtc: {
                                audio: "sendrecv",
                                video: "sendrecv"
                            }
                        }
                    }]
                })
                    .then( response => {
                        trace(response);
                        let endpoint = response.data.endpoint;

                        this.connectionId = endpoint[0].Id;
                        trace('connectionId:' + this.connectionId);
                        this.signalingBridge = response.data.signalingBridge;
                        trace('signalBridge:' + this.signalingBridge);
                        this.createClientServer();

                    })
                    .catch( error => {
                        console.log(error);
                    });
            },
            request(msgObj, method, path) {
              this.webStreamerClient.request({
                method: method,
                path: path,
                body: JSON.stringify(msgObj)
              });
                /*return new Promise( (resolve, reject) => {
                    let data = JSON.stringify(msgObj);
                    let options = {
                        host: `endpoint${this.endpoint_id}`,
                        method: method,
                        path: path,
                        headers: {
                            "Content-Length": data.length
                        }
                    };

                    let req = httpws.request(options, res => {
                        resolve(res);
                    });
                    req.on('timeout', function () {
                        reject(new Error('request timeout'));
                    });
                    req.on('error', function (err) {
                        reject(err);
                    });
                    req.write(data);
                    req.end();
                });*/
            },
            createClientServer() {
                let self = this;

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
              });

/*                httpws.createServer(function (req, res) {
                    let chunk = [];
                    req.on('data', function (data) {
                        chunk.push(data);
                    });
                    req.on('end', function () {
                        let buf = Buffer.concat(chunk);
                        self.notificationHandler(buf.toString());
                    })

                }).connect(`${this.signalingBridge}/endpoint${this.endpoint_id}`).on('onconnect', () => {
                    trace('signalingBridge connected!' + this.signalingBridge + ',' + this.endpoint_id);
                    this.handleJoin();
                });*/
            },
            subscribe() {
/*                if(this.type === null) {
                    alert('Please choose to be offerer or answerer');
                    return ;
                }
                this.subscribeBtn.disabled = true;*/
                let postObj = {
                    endpoint: [{
                        type: 'answerer',
                        connection: this.connectionId.toString(),
                        group: this.groupId.toString(),
                        topic: ['sdp', 'status']
                    }],
                    notify_addr: `endpoint${this.endpoint_id}`
                };
                let self = this;

                this.request(postObj, 'POST', '/webrtc/subscription');

              let msgObj = {
                endpoint: {
                  type: self.type,
                  connection: self.connectionId.toString(),
                  group: self.groupId.toString()
                },
                message: {
                  status: 'connecting'
                }
              };
              self.request(msgObj, 'PUT', '/webrtc/push');
/*                    .then( res => {
                        trace('subscribe successfully');
                        let msgObj = {
                            endpoint: {
                                type: self.type,
                                connection: self.connectionId.toString(),
                                group: self.groupId.toString()
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
                    if(this.peer_connection) {
                        this.createOffer();
                    }
                    //this.callBtn.disabled = false;
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
                //getting local video stream
                let self = this;
              let mediaObj = null;
              alert(localStorage.getItem('mediaType'));
              switch (localStorage.getItem('mediaType')) {
                case '0':
                  mediaObj = {
                    video: true,
                    audio: false
                  };
                  break;
                case '1':
                  mediaObj = {
                    video: false,
                    audio: true
                  };
                  break;
                case '2':
                  mediaObj = {
                    video: true,
                    audio: true
                  };
                  break;
                default:
                  mediaObj = {
                    video: true,
                    audio: false
                  };
                  break;
              }

              console.log('mediaObj：');
              console.log(mediaObj);

                navigator.mediaDevices.getUserMedia(mediaObj).then(mediaHandler.bind(self)).catch(errorHandler);

                function mediaHandler(myStream) {
                    trace('Received local stream');
                    //displaying local video stream on the page
                    this.localVideo.srcObject = myStream;
                    this.localStream = myStream;

                    this.peer_connection = new RTCPeerConnection();


                    let self = this;
                    //setup stream listening
//                    this.peer_connection.addStream(myStream);

                    /*                    let tracksNum = this.localStream.getTracks().length;
                                        trace('trackNum: ' + tracksNum);
                                        for(let i = 0; i < tracksNum; ++i) {
                                            this.peer_connection.addTrack( this.localStream.getTracks()[i], this.localStream);
                                        }*/
                    this.localStream.getTracks().forEach(
                        function(track) {
                            self.peer_connection.addTrack(
                                track,
                                self.localStream
                            );
                        });




                    //when a remote user adds a stream to the peer connection, we display it
                    /*                    this.peer_connection.onaddstream = (e) => {
                                            document.querySelector('#remoteVideo').src = window.URL.createObjectURL(e.stream);
                                        };*/
                    this.peer_connection.ontrack = (e) => {
                        trace('on track');
                        trace(e);
                        if (self.remoteVideo.srcObject !== e.streams[0]) {
                            self.remoteVideo.srcObject = e.streams[0];
                            trace('received remote stream');
                        }
                    };

                    // Setup ice handling
                    this.peer_connection.onicecandidate = function (event) {
                        if (event.candidate) {
                            let msgObj = {
                                endpoint: {
                                    type: self.type,
                                    connection: self.connectionId.toString(),
                                    group: self.groupId.toString()
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
                    this.subscribe();
                }
                function errorHandler(err) {
                    trace(err);
                }
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
                                type: self.type,
                                connection: self.connectionId.toString(),
                                group: self.groupId.toString()
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
                trace('handleAnswer:');
                this.peer_connection.setRemoteDescription(answer);

                let msgObj = {
                    endpoint: {
                        type: this.type,
                        connection: this.connectionId.toString(),
                        group: this.groupId.toString()
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
                let offerOptions = null;
                switch (localStorage.getItem('mediaType')) {
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
                  default:
                    offerOptions = {
                      offerToReceiveAudio: 0,
                      offerToReceiveVideo: 1
                    };
                    break;
                }
              console.log('offerOptions：');
              console.log(offerOptions);

                let self = this;

                trace('createOffer start');
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
/*                    trace(desc.sdp);
                    let sdpArray = desc.sdp.split('\r\n');

                    let newSdpArray = sdpArray.filter( item => {
                        return item.indexOf('nack pli') === -1;
                    });
                    desc.sdp = newSdpArray.join('\r\n');*/

                    //self.callBtn.disabled = true;
                    self.peer_connection.setLocalDescription(desc).then(
                        function() {
                            trace('setLocalDescription complete\n');
                            trace('offer sdp: ' + desc.sdp);

                            let msgObj = {
                                endpoint: {
                                    type: self.type,
                                    connection: self.connectionId.toString(),
                                    group: self.groupId.toString()
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
            handUp(next) {
                if(this.peer_connection === null) {
                    if(next && typeof next === 'function') {
                        next();
                    }
                    return;
                }
                let postObj = {
                    endpoint: [{
                        type: this.type,
                        connection: this.connectionId.toString(),
                        group: this.groupId.toString(),
                        topic: ['sdp', 'status']
                    }],
                    notify_addr: `endpoint${this.endpoint_id}`
                };

                this.request(postObj, 'DELETE', '/webrtc/subscription');
                this.handleLeave(next);
            },
            handleLeave(next) {
                document.querySelector('#remoteVideo').src = null;

                let endpoint = [];
                endpoint.push(this.connectionId);
                axios.delete(`/webmedia/ptt/group/endpoint`, {
                    data: {
                        groupId: this.groupId,
                        endpointId: endpoint
                    }
                })
                    .catch(err => {
                        console.log(err.message);
                    });

                if(this.peer_connection) {
                    this.peer_connection.close();
                    this.peer_connection = null;
                }
                if(next && typeof next === 'function') {
                    next();
                }
            },
            becomeSpeaker () {
                trace('becomeSpeaker');
                axios.post(`/webmedia/ptt/endpoint/speaker`, {
                    endpointId: this.connectionId,
                    groupId: this.groupId,
                })
                    .then( response => {
                        trace(response, 'becomeSpeaker ok');
                    })
                    .catch( error => {
                        console.log(error);
                    });
            }
        }
    }
</script>

<style scoped>
    body {
        background: #eee;
        padding: 5% 0;
    }

    .call-page {
        position: relative;
        display: block;
        margin: 0 auto;
        width: 800px;
        height: 480px;
    }

    video {
        margin: 0 0 20px 0;
        width: calc(50% - 12px);
        background: black;
        border: 1px solid gray;
        float : left;
    }
    video#localVideo {
        margin: 0 20px 20px 0;
    }

    @media screen and (min-width: 730px) {
        video {
            height: 231px;
            width: calc(50% - 12px);
        }
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
    h1 {
        border-bottom: 1px solid #ccc;
        font-family: 'Roboto', sans-serif;
        font-weight: 500;
        margin: 0 0 0.8em 0;
        padding: 0 0 0.2em 0;
    }
</style>
