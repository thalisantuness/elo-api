const express = require('express');

const app = express();
const server = require('http').createServer(app)
const io = require('socket.io')(server);

let messages = [];

io.on('connection', socket => {
    console.log(`Socket conectado: ${socket.id}`)

    socket.emit('previousMessages', messages)

    socket.on('sendMessage', data => {
      messages.push(data);
      socket.broadcast.emit('receivedMessage', data)
    })
})

server.listen(3000)

