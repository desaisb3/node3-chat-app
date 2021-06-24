const http = require('http')
const express = require('express')
const path = require('path')
const socketio = require('socket.io')
const Filter= require('bad-words')
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

//Serve up this folder on the serve
app.use(express.static(publicDirectoryPath))


// server (emit) --> client (receive) -- countUpdated
// client (emit) --> server (receive) -- increment

//client(emit) --> server(receiver) --> acknowledgement --> client

io.on('connection', (socket)=>{
    console.log('New WebSocket Connection')


    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        io.emit('message', generateMessage(message))
        callback()
    })

    socket.on('disconnect', ()=>{
        console.log('Client disconnected!')
        io.emit('message', generateMessage('The user has left'))
    })

    socket.on('sendLocation', (location, callback)=>{
        //Another way to write/access the variables
        //`Latitude: ${location.latitude}, ${location.longitude}`
        io.emit('locationMessage', generateLocationMessage(`https://google.com/maps?q=${location.latitude},${location.longitude}`))

        //Sending acknowledgement to the client that the location has been shared
        callback()
    })

    socket.on('join', ( {username, room } ) => {
        socket.join(room)

        socket.emit('message', generateMessage('Welcome!'))
        socket.broadcast.to(room).emit('message', generateMessage(`${username} has joined!`))

    })

})

server.listen(port, ()=>{
    console.log('Server is up on port: ' + port)
})