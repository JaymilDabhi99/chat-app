const socket = require("socket.io");
const user = require("./models/userModel");

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: "*",
      methods: ['GET', 'POST']
    },
  });

  let onlineUsers = {};

  io.on("connection", (socket) => {
    // console.log('User connected:', socket.id);

    socket.on("new-user", async (username) => {
      console.log(`${username} connected with id: ${socket.id}`);
      onlineUsers[socket.id] = username;
      
      socket.broadcast.emit("user-join", username);

      socket.broadcast.emit("userOnline", { userOnline: onlineUsers });
      const filteredUsers = {};
      for (let id in onlineUsers) {
        if (id !== socket.id) {
          filteredUsers[id] = onlineUsers[id];
        }
      }

        socket.emit('userOnline', {userOnline: filteredUsers});
    });

    socket.on("chat message", (msg) => {
      io.emit("chat message", msg);

    });

    socket.on("typing", (data) => {
      socket.broadcast.emit('typing_status', data);
    });

    socket.on("disconnect", () => {
      const username = onlineUsers[socket.id];
      if (username) {
        delete onlineUsers[socket.id];
        socket.broadcast.emit("user-left", username);
        console.log(`${username} disconnected (${socket.id})`);
        io.emit("userOnline", { userOnline: onlineUsers });
      } else {
        console.log(`Unknown user disconnected (${socket.id})`);
      }
    });
  });
};

module.exports = initializeSocket;
