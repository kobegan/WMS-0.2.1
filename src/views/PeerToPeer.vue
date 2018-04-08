<template>
    <div id = "callPage" class = "call-page">
        <h1>一对一视频</h1>
        <video id = "localVideo" autoplay controls></video>

        <video id = "remoteVideo" autoplay controls></video>

        <div class = "row text-center">
            <select id="endpointType" v-model="type">
                <option v-for="type in endpointTypes">{{type}}</option>
            </select>
            <button id = "subscribeBtn" class = "btn-success btn" @click="subscribe">Subscribe</button>
            <br>
            <br>
            <div class = "col-md-12">
                <button id = "callBtn" class = "btn-success btn" @click="createOffer">Call</button>
                <button id = "hangUpBtn" class = "btn-danger btn" @click="handUp">Hang Up</button>
            </div>
        </div>

    </div>
</template>

<script>
    import httpws from '@/js/httpws/httpws'
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
                type: null,
                endpoint_id: null,
                callBtn: null,
                subscribeBtn: null,
                webStreamerClient: null
            }
        },
        components: {},
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

            let select = document.getElementById('endpointType');
              select.onchange = this.handleJoin.bind(this);

//            this.callBtn.disabled = true;
        },
        created() {
            this.endpoint_id = Math.floor(Math.random()*1000);
            this.connectionId = this.$route.params.Id;

            let self = this;

            axios.get(`/webmedia/signalingBridge/${this.connectionId}`)
                .then( response => {
                    this.signalingBridge = response.data.signalingBridge;
                    trace('signalBridge:' + this.signalingBridge);
                    self.createClientServer();
                })
                .catch( error => {
                    console.log(error);
                });
        },
        methods: {
            request(msgObj, method, path) {
              this.webStreamerClient.request({
                method: method,
                path: path,
                body: JSON.stringify(msgObj)
              });

/*                return new Promise( (resolve, reject) => {
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
                if(reqRes.header.request) {
                  self.notificationHandler(reqRes.body);
                } else {

                }
              }).connect(`${this.signalingBridge}/endpoint${this.endpoint_id}`).on('onconnect', () => {
                trace('signalingBridge connected!' + this.signalingBridge + ',' + this.endpoint_id);
                //this.handleJoin();
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
                if(this.type === null) {
                    alert('Please choose to be offerer or answerer');
                    return ;
                }
                this.subscribeBtn.disabled = true;
                let postObj = {
                    endpoint: [{
                        type: this.type === 'offerer'? 'answerer' : 'offerer',
                        connection: this.connectionId,
                        topic: ['sdp', 'status']
                    }],
                    notify_addr: `endpoint${this.endpoint_id}`
                };
                let self = this;

                this.request(postObj, 'POST', '/webrtc/subscription');
              trace('subscribe successfully');
              let msgObj = {
                endpoint: {
                  type: self.type,
                  connection: self.connectionId
                },
                message: {
                  status: 'connecting'
                }
              };
              this.request(msgObj, 'PUT', '/webrtc/push');
/*                    .then( res => {
                        trace('subscribe successfully');
                        let msgObj = {
                            endpoint: {
                                type: self.type,
                                connection: self.connectionId
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
                    this.callBtn.disabled = false;
                }
                if(data.message.sdp !== undefined) {
                    switch(data.message.sdp.type) {
                        case "offer":
                            this.handleOffer(data.message.sdp.offer);
                            break;
                        case "answer":
                            this.handleAnswer(data.message.sdp.answer);
                            break;
                        case "candidate":
                            this.handleCandidate(data.message.sdp.candidate);
                            break;
                        case "leave":
                            this.handleLeave();
                            break;
                        default:
                            break;
                    }
                }
            },
            handleJoin() {
                //getting local video stream
                let self = this;
              console.log('handleJoin: ' + this.type);

              this.peer_connection = new RTCPeerConnection();

//              if(this.type === 'answerer') {
                if(true) {
                let mediaObj = {
                    video: true,
                    audio: true
                };

                navigator.mediaDevices.getUserMedia(mediaObj).then(mediaHandler.bind(self)).catch(errorHandler);
                function mediaHandler(myStream) {
                  trace('Received local stream');
                  //displaying local video stream on the page
                  this.localVideo.srcObject = myStream;
                  this.localStream = myStream;

                  this.localStream.getTracks().forEach(
                    function(track) {
                      self.peer_connection.addTrack(
                        track,
                        self.localStream
                      );
                    });
                }

                function errorHandler(err) {
                  trace(err);
                }

              }

              this.peer_connection.ontrack = (e) => {
                trace('ontrack');
                console.log(e);
                if (self.remoteVideo.srcObject !== e.streams[0]) {
                  self.remoteVideo.srcObject = e.streams[0];
                  trace('received remote stream');
                }
              };

              // Setup ice handling
              this.peer_connection.onicecandidate = function (event) {
                if (event.candidate) {
                  let sdp = {
                    type: "candidate",
                    candidate: event.candidate
                  };
                  let msgObj = {
                    endpoint: {
                      type: self.type,
                      connection: self.connectionId
                    },
                    message: {
                      sdp: sdp
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



                /*let mediaObj = {"video": true};

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

/!*                    let tracksNum = this.localStream.getTracks().length;
                    trace('trackNum: ' + tracksNum);
                    for(let i = 0; i < tracksNum; ++i) {
                        this.peer_connection.addTrack( this.localStream.getTracks()[i], this.localStream);
                    }*!/
                    this.localStream.getTracks().forEach(
                        function(track) {
                            self.peer_connection.addTrack(
                                track,
                                self.localStream
                            );
                        });




                    //when a remote user adds a stream to the peer connection, we display it
/!*                    this.peer_connection.onaddstream = (e) => {
                        document.querySelector('#remoteVideo').src = window.URL.createObjectURL(e.stream);
                    };*!/
                    this.peer_connection.ontrack = (e) => {
                        if (self.remoteVideo.srcObject !== e.streams[0]) {
                            self.remoteVideo.srcObject = e.streams[0];
                            trace('received remote stream');
                        }
                    };

                    // Setup ice handling
                    this.peer_connection.onicecandidate = function (event) {
                        if (event.candidate) {
                            let sdp = {
                                type: "candidate",
                                candidate: event.candidate
                            };
                            let msgObj = {
                                endpoint: {
                                    type: self.type,
                                    connection: self.connectionId
                                },
                                message: {
                                    sdp: sdp
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
                }
                function errorHandler(err) {
                    trace(err);
                }*/
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
                    let sdp = {
                        type: "answer",
                        answer: answer
                    },
                        msgObj = {
                        endpoint: {
                            type: self.type,
                            connection: self.connectionId
                        },
                        message: {
                            sdp: sdp,
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
                        connection: this.connectionId
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
                let offerOptions = {
                    offerToReceiveAudio: 1,
                    offerToReceiveVideo: 1
                };
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
                    self.callBtn.disabled = true;
                    self.peer_connection.setLocalDescription(desc).then(
                        function() {
                            trace('setLocalDescription complete\n');
                            trace('offer sdp: ' + desc.sdp);

                            let sdp = {
                                type: "offer",
                                offer: desc
                            };
                            let msgObj = {
                                endpoint: {
                                    type: self.type,
                                    connection: self.connectionId
                                },
                                message: {
                                    sdp: sdp
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
            handUp() {
                let postObj = {
                    endpoint: [{
                        type: this.type,
                        connection: this.connectionId,
                        topic: ['sdp', 'status']
                    }],
                    notify_addr: `endpoint${this.endpoint_id}`
                };

                this.request(postObj, 'DELETE', '/webrtc/subscription');
                this.handleLeave();
            },
            handleLeave() {
                document.querySelector('#remoteVideo').src = null;

                this.peer_connection.close();
                this.peer_connection = null;
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
