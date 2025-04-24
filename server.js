const express = require("express");
const { createServer } = require("http");
const { join } = require("path");
const { Server } = require("socket.io");
// const router = require("./routes/route");
require("dotenv").config();
// const connectDB = require("./utils/db");

const app = express();

const server = createServer(app);
const io = new Server(server);

// connectDB();

app.use(express.static(join(__dirname, "/public")));

// app.use(router);

const users = {};

io.on("connection", (socket) => {
  console.log(`a user connected: ${users}`);

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
    console.log("message: " + msg);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
