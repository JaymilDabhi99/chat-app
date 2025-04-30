const express = require("express");
const moment = require("moment");
const { createServer } = require("http");
const { join } = require("path");
const { Server } = require("socket.io");
const router = require("./routes/route");
require("dotenv").config();
const connectDB = require("./utils/db");

const app = express();

const server = createServer(app);
const io = new Server(server);

const dbname = connectDB();

app.use(express.static(join(__dirname, "/public")));

app.use(router);

const users = {};

io.on("connection", (socket) => {
  // console.log(`a user connected: ${users}: ${socket.id}`);

  socket.on("setUsername", (username) => {
    users[socket.id] = username;
    socket.broadcast.emit("notification", `${username} has joined the chat`);
  });

  socket.on("chat message", (msg) => {
    // console.log("message: " + msg);
    io.emit("chat message", msg, moment().format("hh:mm a"));
  });

  socket.on("disconnect", () => {
    if (users[socket.id]) {
      localStorage.removeItem(users[socket.id]);
    }
    // console.log("user disconnected");
    delete users[socket.id];
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
