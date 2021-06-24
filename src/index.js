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
        
        //Fetching the user information in the current room using getUser
        const user = getUser(socket.id)

        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username,message))
        callback()
    })

    socket.on('disconnect', ()=>{

        const user = removeUser(socket.id)

        if(user){
            console.log('Client disconnected!')
            io.to(user.room).emit('message', generateMessage('Admin',`${user.username} has left the chat!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

    })

    socket.on('sendLocation', (location, callback)=>{

        const user = getUser(socket.id)

        //Another way to write/access the variables
        //`Latitude: ${location.latitude}, ${location.longitude}`
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,`https://google.com/maps?q=${location.latitude},${location.longitude}`))

        //Sending acknowledgement to the client that the location has been shared
        callback()
    })

    socket.on('join', ( { username, room }, callback ) => {
        const {error, user} = addUser({ id: socket.id, username, room })

        if(error){
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin','Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has joined!`))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()

    })

})

server.listen(port, ()=>{
    console.log('Server is up on port: ' + port)
})
