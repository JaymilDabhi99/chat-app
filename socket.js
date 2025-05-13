const socket = require("socket.io");
const Message = require("./models/chatModel");

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {
      origin: "*",
      methods: ['GET', 'POST']
    },
  });

  let onlineUsers = {};

  io.on("connection", (socket) => {

    console.log('User connected:', socket.id);
    socket.on("userJoin", async () => {
        const messages = await Message.find({}).sort({ _id: -1 }).limit(10);
        io.to(socket.id).emit("loadmsgs", messages.reverse());
    });
    socket.on("new-user", async (username) => {
      console.log(`${username} connected with id: ${socket.id}`);
      onlineUsers[socket.id] = username;
      socket.broadcast.emit("user-join", username);
      io.emit("userOnline", { onlineUser: onlineUsers });
    });

    socket.on("chat message", async (msg) => {
      const user = onlineUsers[socket.id];
      if(user){
        await Message.create({
          username: msg.username,
          message: msg.message,
          timestamp: msg.timestamp,
        })
        io.emit("chat message", msg);
      }
    });

    socket.on("typing", (data) => {
      socket.broadcast.emit('typing_status', data);
    });

    socket.on("disconnect", () => {
      const username = onlineUsers[socket.id];
      if (username) {
        delete onlineUsers[socket.id];
        socket.broadcast.emit("user-left", username);
        io.emit("userOnline", { userOnline: onlineUsers });
        console.log(`${username} disconnected (${socket.id})`);
      } else {
        console.log(`Unknown user disconnected (${socket.id})`);
      }
    });
    // setInterval(() => {
    //   socket.emit("userOnline", { onlineUser: onlineUsers });
    // }, 1000);
  });
};

module.exports = initializeSocket;
