import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  Platform,
} from "react-native";

import React, { useContext, useEffect, useState,useRef } from "react";
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  registerGlobals,
} from "react-native-webrtc";
import InCallManager from "react-native-incall-manager";
import { GlobalContext } from "./contexts";


const STUN_SERVER = 'stun:webrtc.skyrockets.space:3478';


const CallScreen = () => {
  const { id } = useContext(GlobalContext);

  const SOCKET_URL = `ws://10.0.2.2:3000?userName=${id}`;

  const [socketActive, setSocketActive] = useState(false);
  const [calling, setCalling] = useState(false);
  const [localStream, setLocalStream] = useState({toURL: () => null});
  const [remoteStream, setRemoteStream] = useState({toURL: () => null});

  const [callActive, setCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [otherId, setOtherId] = useState('');
  const [callToUsername, setCallToUsername] = useState('');
  const connectedUser = useRef(null);
  const offerRef = useRef(null);

  const conn = useRef(new WebSocket(SOCKET_URL));

  const yourConn = useRef(
    new RTCPeerConnection({
      iceServers: [
        {
          urls: STUN_SERVER,
        },
        {
          urls: "turn:relay1.expressturn.com:3478",
          username: "ef38YUW8NOX55QFCTK",
          credential: "7kCItQu6noXpfA7W"
      }
      ],
    }),
  );

  useEffect(() => {
    if (socketActive && id.length > 0) {
      try {
        // InCallManager.start({media: 'audio'});
        // InCallManager.setForceSpeakerphoneOn(true);
        // InCallManager.setSpeakerphoneOn(true);
      } catch (err) {
        console.log('InApp Caller ---------------------->', err);
      }

      send({
        type: 'login',
        name: id,
      });
    }
  }, [socketActive, id]);


  useEffect(() => {
    /**
     *
     * Sockets Signalling
     */
    conn.current.onopen = () => {
      console.log('Connected to the signaling server');
      setSocketActive(true);
    };
    //when we got a message from a signaling server
    conn.current.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      // console.log('Data --------------------->', data);
      switch (data.type) {
        case 'login':
          console.log('Login');
          alert("login")
          break;
        //when somebody wants to call us
        case 'offer':
          handleOffer(data.offer, data.caller);
          console.log('Offer =========>');
          break;
        case 'answer':
          handleAnswer(data.answer);
          console.log('Answer======================>');
          break;
        //when a remote peer sends an ice candidate to us
        case 'candidate':
          handleCandidate(data.candidate);
          console.log('Candidate');
          break;
        case 'leave':
          handleLeave();
          console.log('Leave');
          break;
        default:
          break;
      }
    };
    conn.current.onerror = function (err) {
      console.log('Got error', err);
    };
    initLocalVideo();
    registerPeerEvents();
  }, []);

  const registerPeerEvents = () => {
    console.log("connection")
    yourConn.current.onaddstream = (event) => {
      console.log('On Add Remote Stream=====================>');
      setRemoteStream(event.stream);
    };

    // Setup ice handling
    yourConn.current.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          type: 'candidate',
          candidate: event.candidate,
        });
      }
    };
  };

  const initLocalVideo = () => {
    
    mediaDevices
      .getUserMedia({
        audio: true,
        video: {
          mandatory: {
            minWidth: 500, // Provide your own width, height and frame rate here
            minHeight: 300,
            minFrameRate: 30,
          },
          facingMode: 'user',
        
        },
      })
      .then((stream) => {
        // Got stream!
        setLocalStream(stream);

        // setup stream listening
        // yourConn.current.addStream(stream);

        yourConn.current.addTrack(stream.getTracks()[0], stream);
      })
      .catch((error) => {
        // Log error
        console.log("error adding stream",error)
      });
    // });
  };

  const send = (message) => {
    //attach the other peer username to our messages
    if (connectedUser.current) {
      message.name = connectedUser.current;
      // console.log('Connected iser in end----------', message);
    }
    console.log('Message', message);
    conn.current.send(JSON.stringify(message));
  };

  const onCall = () => {
    sendCall(callToUsername);
    setTimeout(() => {
      sendCall(callToUsername);
    }, 1000);
  };

  const sendCall = (receiverId) => {
    setCalling(true);
    const otherUser = receiverId;
    connectedUser.current = otherUser;
    console.log('Caling to', otherUser);
    // create an offer
    yourConn.current.createOffer().then((offer) => {
      yourConn.current.setLocalDescription(offer).then(() => {
        console.log('Sending Ofer');
        // console.log(offer);
        send({
          type: 'offer',
          offer: offer,
          caller:id
        });
        // Send pc.localDescription to peer
      });
    });
  };

  const handleOffer = async (offer, name) => {
    console.log(name + ' is calling you.');
    connectedUser.current = name;
    offerRef.current = {
      name, offer
    };
    setIncomingCall(true);
    setOtherId(name);
    // acceptCall();
    // if (callActive) acceptCall();
    acceptCall()
  };

  const acceptCall = async () => {
    const name = offerRef.current.name;
    const offer = offerRef.current.offer;
    setIncomingCall(false);
    setCallActive(true);
    console.log('Accepting CALL', name, offer);
    yourConn.current
      .setRemoteDescription(offer)
      .then(function () {
        connectedUser.current = name;
        return yourConn.current.createAnswer();
      })
      .then(function (answer) {
        yourConn.current.setLocalDescription(answer);
        send({
          type: 'answer',
          answer: answer,
        });
      })
      .then(function () {
        // Send the answer to the remote peer using the signaling server
      })
      .catch((err) => {
        console.log('Error acessing camera', err);
      });

    
  };

  const handleAnswer = (answer) => {
    setCalling(false);
    setCallActive(true);
    yourConn.current.setRemoteDescription(new RTCSessionDescription(answer));
  };

   //when we got an ice candidate from a remote user
   const handleCandidate = (candidate) => {
    setCalling(false);
    // console.log('Candidate ----------------->', candidate);
    yourConn.current.addIceCandidate(new RTCIceCandidate(candidate));
  };


  const onLogout = () => {
    // hangUp();

    handleLeave();

    AsyncStorage.removeItem('userId').then((res) => {
      navigation.push('Login');
    });
  };

  const rejectCall = async () => {
    send({
      type: 'leave',
    });
    // ``;
    // setOffer(null);

    // handleLeave();
  };

  const handleLeave = () => {
    send({
      name: userId,
      otherName: otherId,
      type: 'leave',
    });

    setCalling(false);
    setIncomingCall(false);
    setCallActive(false);
    offerRef.current = null;
    connectedUser.current = null;
    setRemoteStream(null);
    setLocalStream(null);
    yourConn.current.onicecandidate = null;
    yourConn.current.ontrack = null;

    resetPeer();
    initLocalVideo();
    // console.log("Onleave");
  };

  const resetPeer = () => {
    yourConn.current = new RTCPeerConnection({
      iceServers: [
        {
          urls: STUN_SERVER,
        },
        {
          urls: "turn:relay1.expressturn.com:3478",
          username: "ef38YUW8NOX55QFCTK",
          credential: "7kCItQu6noXpfA7W"
      }
      ],
    });

    registerPeerEvents();
  };

  return (
    <View style={styles.root}>
      <View style={styles.inputField}>
      {/* <TextInput
      label="Enter Friends Id"
      style={styles.input}
      onChangeText={(text) => setCallToUsername(text)}
    /> */}
     <TextInput
          placeholder="enter a number to call"
          value={callToUsername}
          onChangeText={(text) => setCallToUsername(text)}
        />
        <Text>
          SOCKET ACTIVE:{socketActive ? 'TRUE' : 'FASLE'}, FRIEND ID:
          {callToUsername || otherId}
        </Text>

        <Button
          title="Call"
          onPress={onCall}
          loading={calling}

          // Add your custom styling here
        >
          Call
        </Button>


        {/* <Button
          title="Call"
          onPress={onCall}
          loading={calling}
          contentStyle={styles.btnContent}
          // Add your custom styling here
          disabled={!callActive}

        >
         Call
        </Button>

        <Button
          title="Call"
          onPress={onCall}
          loading={calling}
          contentStyle={styles.btnContent}
          // Add your custom styling here
          disabled={!callActive}

        >
         End Call
        </Button> */}
      </View>

      <View style={styles.videoContainer}>
        <View style={[styles.videos, styles.localVideos]}>
          <Text>Your Video</Text>
          <RTCView
            streamURL={localStream ? localStream.toURL() : ''}
            style={styles.localVideo}
          />
        </View>
        <View style={[styles.videos, styles.remoteVideos]}>
          <Text>Friends Video</Text>
          <RTCView
            streamURL={remoteStream ? remoteStream.toURL() : ''}
            style={styles.remoteVideo}
          />
        </View>
      </View>
    </View>

    
  )
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#fff',
    flex: 1,
    padding: 20,
  },
  inputField: {
    marginBottom: 10,
    flexDirection: 'column',
  },
  videoContainer: {
    flex: 1,
    minHeight: 450,
  },
  videos: {
    width: '100%',
    flex: 1,
    position: 'relative',
    overflow: 'hidden',

    borderRadius: 6,
  },
  localVideos: {
    height: 100,
    marginBottom: 10,
  },
  remoteVideos: {
    height: 400,
  },
  localVideo: {
    backgroundColor: '#f2f2f2',
    height: '100%',
    width: '100%',
  },
  remoteVideo: {
    backgroundColor: '#f2f2f2',
    height: '100%',
    width: '100%',
  },
});

export default CallScreen