const socket = require("socket.io");

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {origin: "*",
      methods: ['GET', 'POST']
    },
  });
  let onlineUsers = [];

  io.on("connection", (socket) => {
    console.log('a user connected:', socket.id);

    // Handle events
    socket.on("new-user", (username) => {
      onlineUsers[socket.id] = username;
      // console.log("username: ", username);
      console.log(`${username} connected with id: ${socket.id}`);
      io.emit('userOnline', formatUsers(onlineUsers));

      socket.broadcast.emit("user-join", username);
      
    });

    socket.on("chat message", (msg) => {
      // console.log("message: " + msg);
      io.emit("chat message", msg);
    });

    socket.on("typing", (data) => {
      socket.broadcast.emit('typing_status', data);
    })

    socket.on("disconnect", () => {
       const username = onlineUsers[socket.id];
       console.log(`${username} disconnected ${socket.id}`);

       socket.broadcast.emit('user-left', username);

       delete onlineUsers[socket.id];
       io.emit('userOnline', formatUsers(onlineUsers));
    });
  });

  function formatUsers(obj){
    const formattedUsers = Object.entries(obj).map(([socketId, username]) => {
      return ({ userId: socketId, username });
    });
    return formattedUsers;
  }
};

module.exports = initializeSocket;
