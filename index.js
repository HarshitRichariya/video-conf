'use strict'

// Loading dependencies and initializing express
const os = require('os'); // for operating system related utility methods and properties
const express = require('express');
const app = express();
const http = require('http');

// For signaling in WebRTC
const socketIO = require('socket.io');

// Define the folder which contains the CSS and JS for the frontend
app.use(express.static('public'));

// Set view engine to EJS
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render("index.ejs");
})

// Initialize http server and associate it with express
const server = http.createServer(app);

server.listen(process.env.port || 8000, () => console.log('Server running on port 8000'));

const io = socketIO(server);

//Implementing Socket.io
//connection is a synonym of reserved event connect
//connection event is fired as soon as a client connects to this socket.
io.sockets.on('connection', function (socket) {
    
    // Convenience function to log server messages on the client.
    // Arguments is an array like object which contains all the arguments of log(). 
    // To push all the arguments of log() in array, we have to use apply().
    function log() {
        let array = ['Message from server:'];
        array.push.apply(array, arguments);
        socket.emit('log', array);
    }

    // Defining Server behaviour on Socket Events
    socket.on('message', function (message, room) {
        log('Client said: ', message);
        // server should send the recieve only in room
        socket.in(room).emit('message', message, room);
    });

    // Event for joining/creating room
    socket.on('create or join', function (room) {
        log('Received request to create or join room ' + room);

        // Finding clients in the current room
        let clientsInRoom = io.sockets.adapter.rooms[room];
        let numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
        log(`Room ${room} now has ${numClients} client(s)`);

        // If no client is already in the room, create a room and add the current client
        if (numClients === 0) {
            socket.join(room);
            log(`Client ID ${socket.id} created room ${room}`);
            socket.emit('Created', room, socket.id);
        }

        // If no client is already in the room, add this client in the room
        else if (numClients === 1) {
            log(`Client ID ${socket.id} joined room ${room}`);
            io.sockets.in(room).emit('join', room);
            socket.join(room);
            socket.emit('joined', room, socket.id);
            io.sockets.in(room).emit('ready');
        }

        // If two clients are already present in the room, do not add the current client in the room
        else { // max two clients
            socket.emit('full', room);
        }
    });

    // Utility event
    socket.on('ipaddr', function () {
        let ifaces = os.networkInterfaces();
        for (let dev in ifaces) {
            ifaces[dev].forEach(details => {
                if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
                    socket.emit('ipaddr', details.address);
                }
            });
        }
    });

    // Event for notifying other client when a client leaves the room
    socket.on('bye', () => {
        console.log('received bye');
    });
});