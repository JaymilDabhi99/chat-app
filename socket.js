const socket = require("socket.io");

const initializeSocket = (server) => {
  const io = socket(server, {
    cors: {},
  });
  const users = {};

  io.on("connection", (socket) => {
    // console.log(`a user connected: ${users}: ${socket.id}`);

    // Handle events
    socket.on("setUsername", (username) => {
      users[socket.id] = username;
      socket.broadcast.emit("notification", `${username} has joined the chat`);
    });

    socket.on("chat message", (msg) => {
      // console.log("message: " + msg);
      io.emit("chat message", msg);
    });

    socket.on("disconnect", () => {
      if (users[socket.id]) {
        localStorage.removeItem(users[socket.id]);
      }
      // console.log("user disconnected");
      delete users[socket.id];
    });
  });
};

module.exports = initializeSocket;
