'use strict'

// Defining some global utility variables
let isChannelReady = false;
let isInitiator = false;
let isStarted = false;
let localStream;
let pc;
let remoteStream;
let turnReady;

// Initialize turn/stun server here
// turn config will be defined in public/js/config.js
let pcConfig = turnConfig;

// Set local stream constraints
let localStreamConstraints = {
    audio: true,
    video: true
};

// Prompting for room name:
let room = prompt('Enter room name:');

// Initializing socket.io
let socket = io.connect();

// Ask server to add in the room if room name is provided by the user
if (room !== '') {
    socket.emit('create or join', room);
    console.log(`Attempted to create or join room ${room}`);
}

// Define socket events

// Event - Client has created the room i.e. is the first member of the room
socket.on('created', (room) => {
    console.log.log(`Created room ${room}`);
    isInitiator = true;
});

// Event - Room is full
socket.on('full', (room) => {
    console.log(`Room ${room} is full`);
});

// Event - Another client tries to join the room
socket.on('join', (room) => {
    console.log(`Another peer made a request to join room ${room}`);
    console.log(`This peer is the initiator or room ${room}!`);
    isChannelReady = true;
});

// Event - Client has joined the room
socket.on('joined', (room) => {
    console.log(`joined: ${room}`);
    isChannelReady = true;
});

// Event - Server asks to log a message
socket.on('log', (array) => {
    console.log.apply(console, array);
});

// Event - for sending meta for establishing a direct connection using WebRTC
// The driver code
socket.on('message', (message, room) => {
    console.log(`Client received message: ${message} ${room}`);
    if (message === 'got user media') {
        maybeStart();
    } else if (message.type === 'offer') {
        if (!isInitiator && !isStarted) {
            maybeStart();
        }
        pc.setRemoteDescription(new RTCSessionDescription(message));
        doAnswer();
    } else if (message.type === 'answer' && isStarted) {
        pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' && isStarted) {
        let candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });
        pc.addIceCandidate(candidate);
    } else if (message === 'bye' && isStarted) {
        handleRemoteHangup();
    }
});

// Function to send message in a room
function sendMessage(message, room) {
    console.log(`Client sending message; ${message} ${room}`);
    socket.emit('message', message, room);
}

// Displaying Local Stream and Remote Stream in webpage
let localVideo = document.querySelector('#localVideo');
let remoteVideo = document.querySelector('#remoteVideo');
console.log("Going to find local media");
navigator.mediaDevices.getUserMedia(localStreamConstraints)
    .then(gotStream)
    .catch(e => {
        alert(`getUserMedia() error: ${e.name}`);
    });

// If found local stream
function gotStream(stream) {
    console.log('Adding local stream.');
    localStream = stream;
    localVideo.srcObject = stream;
    sendMessage('got user mdeia', room);
    if (isInitiator) {
        maybeStart();
    }
}

console.log('Getting user media with constraints', localStreamConstraints);

// If initiator, create the peer connection
function maybeStart() {
    console.log('>>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
    if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
        console.log('>>>>>>>> creating peer connection');
        createPeerConnection();
        pc.addStream(localStream);
        isStarted = true;
        console.log('isInitiator', isInitiator);
        if (isInitiator) {
            doCall();
        }
    }
}

// Sending bye if user closes the window
window.onbeforeunload = () => {
    sendMessage('bye', room);
}

// Creating peer connection
function createPeerConnection() {
    try {
        pc = new RTCPeerConnection(pcConfig);
        pc.onicecandidate = handleIceCandidate;
        pc.onaddstream = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
        console.log('Created RTCPeerConnection');
    } catch (e) {
        console.log(`Failed to create PeerConnection, exception: e.message`);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
}

// Function to handle Ice candidates generated by the browser
function handleIceCandidate(event) {
    console.log('icecandidate event: ', event);
    if (event.candidate) {
        sendMessagae({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        }, room);
    } else {
        console.log('End of candidates.');
    }
}

function handleCreateOfferError(event) {
    console.log(`createOffer() error: ${event}`);
}

// Function to create offer
function doCall() {
    console.log('Sending offer to peer');
    pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

// Function to create answer for the received offer
function doAnswer() {
    console.log('Sending answer to peer.');
    pc.createAnswer().then(
        setLocalAndSendMessage,
        onCreateSessionDescriptionError
    );
}

// Function to set description of Local media
function setLocalAndSendMessage(sessionDescription) {
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    sendMessage(sessionDescription, room);
}

function onCreateSessionDescriptionError(error) {
    trace(`Failed to create session description: ${error.toString()}`);
}

// Function to play remote stream as soon as this client reeives it
function handleRemoteStreamAdded(event) {
    console.log('Remote stream added.');
    remoteStream = event.stream;
    remoteVideo.srcObjec = remoteStream;
}

function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removoed. Event: ', event);
}

function hangup() {
    console.log('Hanging up.');
    stop();
    sendMessage('bye', room);
}

function handleRemoteHangup() {
    console.log('Session terminated.');
    stop();
    isInitiator = false;
}

function stop() {
    isStarted = false;
    pc.close();
    pc = null;
}