import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  Platform,
  Alert
} from "react-native";
import React, { useContext, useEffect, useState, useCallback } from "react";
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

const CallTwo = () => {
  let name;
  let connectedUser;
  const [userId, setUserId] = useState("");
  const [socketActive, setSocketActive] = useState(false);
  const [calling, setCalling] = useState(false);
  // Video Scrs
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const { id } = useContext(GlobalContext);

  let reurl = 1;

  const [conn, setConn] = useState(
    new WebSocket(`ws://10.0.2.2:3000?userName=${id}`)
  );

  // const [conn, setConn] = useState(
  //   new WebSocket(`ws://104.198.75.214?userName=${id}`)
  // );

  const [yourConn, setYourConn] = useState(
    //change the config as you need
    new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
        {
          urls: "turn:relay1.expressturn.com:3478",
          username: "ef38YUW8NOX55QFCTK",
          credential: "7kCItQu6noXpfA7W",
        },
      ],
    })
  );

  const [offerStatus, setOfferStatus] = useState(true);

  const [callToUsername, setCallToUsername] = useState(null);

  //   inCall Manager UseEffect
  // useEffect(() => {

  //     try {
  //       InCallManager.start({ media: "audio" });
  //       InCallManager.setForceSpeakerphoneOn(true);
  //       InCallManager.setSpeakerphoneOn(true);
  //     } catch (err) {
  //       console.log("InApp Caller ---------------------->", err);
  //     }

  //     console.log(InCallManager);

  //     // send({
  //     //   type: "login",
  //     //   name: "Frank",
  //     // });
  // }, []);

  useEffect(() => {
    if (socketActive) {
      try {
        InCallManager.start({ media: "audio" });
        InCallManager.setForceSpeakerphoneOn(true);
        InCallManager.setSpeakerphoneOn(true);
      } catch (err) {
        console.log("InApp Caller ---------------------->", err);
      }

      console.log("id is ", id);

      send({
        type: "login",
        name: id,
      });
    }
  }, [socketActive]);

  // webrtc call signal start here
  useEffect(() => {
    // console.log(yourConn);
    alert(id);

    conn.onopen = () => {
      // console.log("Connected to the signaling server");

      alert("Connected to the signaling server");

      setSocketActive(true);
    };
    //when we got a message from a signaling server
    conn.onmessage = (msg) => {
      console.log("======incoming=======");

      let data;
      if (msg.type === "login") {
        data = {};
        console.log("user Accepted");
      } else {
        data = JSON.parse(msg.data);
        // console.log("Data --------------------->", data);
        switch (data.type) {
          case "login":
            // console.log("Login");
            // alert("login")
            break;
          //when somebody wants to call us
          case "offer":
            handleOffer(data.offer, data.caller);

            // console.log("caller",data.caller);
            break;

          case "answer":
            handleAnswer(data.answer);
            // console.log("Answer", data.answer);
            break;
          //when a remote peer sends an ice candidate to us
          case "candidate":
            handleCandidate(data.candidate);
            console.log("Candidate");
            break;
          case "leave":
            handleLeave();
            console.log("Leave");
            break;
          default:
            break;
        }
      }
    };
    conn.onerror = function (err) {
      console.log("Got error", err);
    };
    /**
     * Socjket Signalling Ends
     */

    let isFront = false;

    // Create a new MediaStream for the local video feed

    mediaDevices
      .getUserMedia({
        audio: true,
        video: {
          width: { min: 500 },
          height: { min: 300 },
          frameRate: { min: 30 },
          facingMode: "user",
        },
      })
      .then((stream) => {
        // Got stream!
        setLocalStream(stream);
        // setup stream listening

        const tracks = stream.getTracks();

        tracks.forEach((track) => {
          yourConn.addTrack(track, stream);
          console.log("track ================>kind", track.kind);
        });
      })
      .catch((error) => {
        // Log error
        console.log("error adding stream", error);
      });

    const remoteStream = new MediaStream();

    // yourConn.ontrack = (event) => {
    //   const track = event.track;
    //   if (track) {
    //     console.log("Received track:", track);

    //     // Add the incoming track to the remoteStream
    //     remoteStream.addTrack(track);

    //     // Set the remoteStream to update the UI with the remote video feed
    //     setRemoteStream(remoteStream);
    //   }
    // };

    yourConn.ontrack = (event) => {
      const stream = event.streams[0];

      console.log(
        "======================================================================="
      );

      if (
        stream &&
        stream._tracks &&
        Array.isArray(stream._tracks) &&
        stream._tracks.length > 0
      ) {
        const audioTrack = stream._tracks.find(
          (track) => track.kind === "audio"
        );
        const videoTrack = stream._tracks.find(
          (track) => track.kind === "video"
        );

        if (audioTrack && videoTrack) {
          // const newStream = new MediaStream([audioTrack, videoTrack]);

          // setRemoteStream(newStream);

          const remote = new MediaStream();

          event.streams[0].getTracks().forEach((track) => {
            remote.addTrack(track);
          });

          setRemoteStream(remote);

          console.log(
            "<<<<<<<<<<<<<<<The stream contains both audio and video tracks=================:",
            remote.toURL()
          );
        } else if (audioTrack) {
          console.log("The stream contains only an audio track:", stream);
        } else if (videoTrack) {
          console.log("The stream contains only a video track:", stream);
        } else {
          console.log(
            "The stream does not contain audio or video tracks:",
            stream
          );
        }
      } else {
        console.log("Invalid stream object or no tracks found in the stream");
      }

      console.log("======event====stream", event.streams[0]);
    };

    // Setup ice handling

    yourConn.addEventListener("iceconnectionstatechange", (event) => {
      let otherUser = callToUsername;

      console.log("###############", callToUsername);

      switch (yourConn.iceConnectionState) {
        case "connected":
          console.log(".........icecandiate connected............");
          break;
        case "checking":
          console.log("checking....");
          break;
        case "completed":
          // Handle the call being connected here
          // For example, set video streams to visible
          // setVideoVisible(true); // Assuming you have a state variable to control video visibility
          console.log(
            "<<<<<<<<<<<<<________ICE Connection State completed:_____",
            yourConn.iceConnectionState
          );
          break;
        case "failed":
          // Handle the case where the ICE connection has failed
          console.log("ICE Connection State:", yourConn.iceConnectionState);
          console.log("ICE connection failed. Handle the failure scenario.");

          // reconnecting()

          break;
        default:
          // Handle other ICE connection states if needed
          console.log("ICE Connection State:", yourConn.iceConnectionState);
          break;
      }
    });

    yourConn.onicecandidate = (event) => {
      console.log("can");
      if (event.candidate) {
        send({
          type: "candidate",
          candidate: event.candidate,
          To: callToUsername,
        });
      }
    };
  }, [conn]);

  // useEffect(() => {
  //   if (remoteStream) {
  //     console.log("Remote stream:", remoteStream);

  //     if (remoteStream.getTracks().length === 0) {
  //       console.error("Remote stream does not contain any tracks");
  //     } else {
  //       const audioTracks = remoteStream.getAudioTracks();
  //       const videoTracks = remoteStream.getVideoTracks();

  //       if (audioTracks.length === 0 && videoTracks.length === 0) {
  //         console.log(
  //           "=====Remote stream does not contain audio or video tracks::===",
  //           remoteStream
  //         );
  //       } else if (audioTracks.length === 0) {
  //         console.log("Remote stream contains only video tracks");
  //       } else if (videoTracks.length === 0) {
  //         console.log("Remote stream contains only audio tracks");
  //       } else if (audioTracks.length > 0 && videoTracks.length > 0) {

  //         console.log("<<<<<<<<<<<<<<<<<<Remote stream contains both audio and video tracks");

  //       } else {
  //         console.log("dont know the problemr");
  //       }
  //     }
  //   }
  // }, [remoteStream]);

  const send = (message) => {
    //attach the other peer username to our messages
    if (connectedUser) {
      message.name = connectedUser;
      // console.log("Connected iser in end----------", message);
    }

    conn.send(JSON.stringify(message));
  };

  const onCall = () => {
    // setCalling(true);

    connectedUser = callToUsername;
    console.log("Caling to", connectedUser);
    // create an offer

    yourConn.createOffer().then((offer) => {
      yourConn.setLocalDescription(offer).then(() => {
        console.log("Sending Offer");

        send({
          type: "offer",
          offer: offer,
          caller: id,
        });

        // Send pc.localDescription to peer
      });
    });
  };

  //when somebody sends us an offer
  // const handleOffer = async (offer, name) => {
  //   console.log(name + " is calling you.");

  //   console.log("Accepting Call===========>", offer);
  //   connectedUser = name;

  //   try {
  //     await yourConn.setRemoteDescription(new RTCSessionDescription(offer));

  //     yourConn.ontrack = (event) => {
  //       console.log("Track added", event);
  //       setRemoteStream(event.streams[0]);
  //     };

  //     const answer = await yourConn.createAnswer();

  //     await yourConn.setLocalDescription(answer);
  //     send({
  //       type: "answer",
  //       answer: answer,
  //       // To:callToUsername
  //     });
  //   } catch (err) {
  //     console.log("Offerr Error", err);
  //   }
  // };

  // const handleOffer = useCallback(async (offer, name) => {
  //   console.log(name + " is calling you.");
  //   console.log("Accepting Call===========>", offer);
  //   connectedUser = name;
    
  //   const handleOfferLogic = async () => {
  //     try {
  //       await yourConn.setRemoteDescription(new RTCSessionDescription(offer));
  //       const answer = await yourConn.createAnswer();
  //       await yourConn.setLocalDescription(answer);
  //       send({ type: "answer", answer: answer });
  //     } catch (err) {
  //       console.log("Offer Error", err);
  //     }
  //   };
  
  //   if (offerStatus) {
  //     handleOfferLogic();
  //   } else {
  //     console.log("Waiting for offerStatus to be true...");
  //     // You can add additional logic here, such as retrying or waiting for offerStatus to be true
  //   }
  // }, [offerStatus]);

  
  const handleOffer = async (offer, name) => {
    return new Promise((resolve, reject) => {
      Alert.alert(
        `${name} is calling. Accept call?`,
        "",
        [
          { text: "Cancel", onPress: () => reject("Call rejected") },
          { text: "Accept", onPress: () => resolve("Call accepted") },
        ]
      );
    })
    .then(async(response) => {
      if (response === "Call accepted") {
        // setOffer(offer);
        console.log("Call accepted by user.",offer);
        connectedUser = name;

          try {
      await yourConn.setRemoteDescription(new RTCSessionDescription(offer));

      yourConn.ontrack = (event) => {
        console.log("Track added", event);
        setRemoteStream(event.streams[0]);
      };

      const answer = await yourConn.createAnswer();

      await yourConn.setLocalDescription(answer);
      send({
        type: "answer",
        answer: answer,
        // To:callToUsername
      });
    } catch (err) {
      console.log("Offerr Error", err);
    }
        
      } else {
        console.log("Call rejected by user.");
        // Optionally, send a "reject" message to the caller
      }
    })
    .catch((error) => {
      console.log(error);
      // Handle the case when the user cancels or rejects the call
      // Optionally, send a "reject" message to the caller
    });
  }

  //when we got an answer from a remote user
  const handleAnswer = (answer) => {
    console.log("answer =======================>", answer);

    yourConn
      .setRemoteDescription(new RTCSessionDescription(answer))
      .then(() => {
        console.log("Remote description set successfully with the answer");
      })
      .catch((error) => {
        console.error(
          "Error setting remote description with the answer:",
          error
        );
      });
  };

  //when we got an ice candidate from a remote user
  const handleCandidate = (candidate) => {
    console.log("Candidate ----------------->", candidate);
    yourConn.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const reconnecting = async () => {
    onCall();

    for (let i = 0; i < 10; i++) {
      console.log("Waiting for 30 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    onCall();
  };
  //hang up
  const hangUp = () => {
    send({
      type: "leave",
    });

    handleLeave();
  };

  const handleLeave = () => {
    connectedUser = null;
    setRemoteStream({ toURL: () => null });

    yourConn.close();
    // yourConn.onicecandidate = null;
    // yourConn.onaddstream = null;
  };

  const acceptCall = async () => {
    // setOfferStatus(true)
    console.log("answering")
  };

  // const acceptCall = useCallback(async() => {
  //   console.log("Accepting Call===========>", offer);
  //   connectedUser = offer.name;
  //   if (offer != null) {
  //     try {
  //       await yourConn.setRemoteDescription(new RTCSessionDescription(offer));

  //       const answer = await yourConn.createAnswer();

  //       await yourConn.setLocalDescription(answer);

  //       send({
  //         type: "answer",
  //         answer: answer,
  //       });
  //     } catch (err) {
  //       console.log("Offerr Error", err);
  //     }
  //     console.log("offer is nnot null", offer);
  //   }
  // }, [offer]);

  const rejectCall = async () => {
    send({
      type: "leave",
    });
    ``;
    setOffer(null);

    handleLeave();
  };

  /**
   * Calling Stuff Ends
   */

  return (
    <View style={styles.root}>
      <View style={styles.inputField}>
        <TextInput
          placeholder="enter a number to call"
          value={callToUsername}
          onChangeText={(text) => setCallToUsername(text)}
        />

        <Button
          title="Call"
          onPress={() => {
            console.log("calling", callToUsername);
            connectedUser = callToUsername;
            reconnecting();
          }}
          loading={calling}

          // Add your custom styling here
        >
          Call
        </Button>

        <Button
          title="Answer"
          onPress={() => {
            console.log("calling", callToUsername);
            connectedUser = callToUsername;
            acceptCall();
          }}
          loading={calling}

          // Add your custom styling here
        >
          Answer
        </Button>
      </View>

      <View style={styles.videoContainer}>
        <View style={[styles.videos, styles.localVideos]}>
          <Text>Your Video</Text>
          {localStream && (
            <RTCView
              streamURL={localStream.toURL()}
              objectFit={"cover"}
              style={styles.localVideo}
            />
          )}
        </View>
        <View style={[styles.videos, styles.remoteVideos]}>
          <Text>Friends Video</Text>

          {remoteStream !== null && (
            <RTCView
              streamURL={remoteStream.toURL()}
              zOrder={2}
              objectFit={"cover"}
              mirror={true}
              style={styles.remoteVideo}
              onError={(error) =>
                console.error("Error displaying video:", error)
              }
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#fff",
    flex: 1,
    padding: 20,
  },
  inputField: {
    marginBottom: 10,
    flexDirection: "column",
  },
  videoContainer: {
    flex: 1,
    minHeight: 450,
  },
  videos: {
    width: "100%",
    flex: 1,
    position: "relative",
    overflow: "hidden",

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
    backgroundColor: "#f2f2f2",
    height: "100%",
    width: "100%",
  },
  remoteVideo: {
    backgroundColor: "#f2f2f2",
    height: "100%",
    width: "100%",
  },
});

export default CallTwo;
