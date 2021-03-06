var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var ROOM_LIST = [];
var USER_LIST = [];

var USER = function(USER_ID, ROOM_ID, sock) {
    var user = {
        username : USER_ID,
        roomid : ROOM_ID,
        socketid : sock
    }
    return user;
}

app.set('port', (process.env.PORT || 5000));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client.html');
});

var room;
app.get('/*', function(req, res) {
    var url = req.path.substring(1);
    for (var i = 0; i < ROOM_LIST.length; i++) {
        if (ROOM_LIST[i] == url) {
            res.sendFile(__dirname + '/room.html');
            return;
        }
    }
    res.status(404).send('404: Room does not exist.');
});

io.on('connection', function(socket) {
    console.log('User connected to lobby.');
    
    socket.emit('getRooms', {rooms : ROOM_LIST});
    
    socket.on('updateRooms', function(data) {
        socket.emit('getRooms', {rooms : ROOM_LIST});
    });
    socket.on('updateUsers', function(data) {
        socket.emit('getUsers', {users : USER_LIST});
    });
    
    // create a room
    socket.on('creation', function(data) {
        room = data.ROOM_ID;
        ROOM_LIST.push(room);
        console.log('Room ' + room + ' has been created.');
    });
    
    // join a room
    socket.on('joinRoom', function(data) {
        socket.join(data.ROOM_ID);
        var user = USER(data.USER_ID, data.ROOM_ID, socket.id);
        USER_LIST.push(user);
        io.emit('getUsers', {users : USER_LIST});
        io.to(data.ROOM_ID).emit('connectionMsg', {MESSAGE : user.username + " connected."});
    });
    
    // check if a room exists
    socket.on('checkRoom', function(data) {
        var exists = false;;
        for (var i = 0; i < ROOM_LIST.length; i++) {
            if (ROOM_LIST[i] == data.ROOM_ID) {
                exists = true;
                room = data.ROOM_ID;
                break;
            }
        }
        socket.emit('roomExists', {state : exists});
    });
    
    // receives and outputs a message
    socket.on('message', function(data) {
        var msg = data.MESSAGE;
        var id = data.ROOM_ID;
        io.to(id).emit('showMsg', {MESSAGE : msg, USER_ID : data.USER_ID});
    })
    
    socket.on('disconnect', function(data) {
        console.log('User disconnected.');
        
        // remove user from USER_LIST
        var roomleft;
        for (var i = 0; i < USER_LIST.length; i++) {
            if (USER_LIST[i].socketid == socket.id) {
                roomleft = USER_LIST[i].roomid;
                io.to(roomleft).emit('connectionMsg', {MESSAGE : USER_LIST[i].username + " disconnected."});
                USER_LIST.splice(i, 1);
            }
        }
        
        // remove room from ROOM_LIST if no more users in room
        var roomexists = false;
        for (var i = 0; i < USER_LIST.length; i++) {
            if (USER_LIST[i].roomid == roomleft) {
                roomexists = true;
                break;
            }
        }
        if (roomexists == false) {
            for (var i = 0; i < ROOM_LIST.length; i++) {
                if (ROOM_LIST[i] == roomleft)
                    ROOM_LIST.splice(i, 1);
            }
        }
            
        io.emit('getUsers', {users : USER_LIST});
    });
})

http.listen(app.get('port'), function(){
    console.log('Server running...');
});