const socket = require("socket.io");

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {},
  });
  const onlineUsers = {};

  io.on("connection", (socket) => {
    // console.log(`a user connected: ${users}: ${socket.id}`);

    // Handle events
    socket.on("connect", (socket) => {
      onlineUsers[userId] = socket.id;
      socket.broadcast.emit("notification", `${userId} has joined the chat`);
      io.emit('userOnline', {userId, status: 'online' });
    });

    socket.on("chat message", (msg) => {
      // console.log("message: " + msg);
      io.emit("chat message", msg);
    });

    socket.on("typing", (data) => {
      socket.broadcast.emit('typing_status', data);
    })

    socket.on("disconnect", () => {
      for(let userId in onlineUsers){
        if(onlineUsers[userId] === socket.id){
            delete onlineUsers[userId];
            io.emit('userOffline',{userId, status: 'offline'});
        }
    }
    });
  });
};

module.exports = initializeSocket;
