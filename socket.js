require("dotenv").config();
const socketIO = require("socket.io");
const cloudinary = require("cloudinary").v2;
const Message = require("./models/chatModel");
const Media = require("./models/mediaModel");

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

// In-memory store for online users (socketId -> { username, room })
const onlineUsers = new Map();

function initializeSocket(server) {
  const io = socketIO(server, {
    maxHttpBufferSize: 1e7,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.once("joinRoom", (data) => handleJoinRoom(socket, io, data));

    socket.on("typing", (data) => handleTyping(socket, data));
    socket.on("chat message", (msg) => handleChat(socket, io, msg));
    socket.on("delete-message", (data) => handleDelete(socket, io, data));
    socket.on("disconnect", () => handleDisconnect(socket, io));
  });
}

async function handleJoinRoom(socket, io, { username, room }) {
  try {
    socket.join(room);
    socket.username = username;
    socket.room = room;
    onlineUsers.set(socket.id, { username, room });

    socket.broadcast.to(room).emit("user_join", username);
    console.log(`{username} joined room: ${room}`);

    // Load last 20 messages
    const messages = await Message.find({ roomId: room })
      .sort({ _id: -1 })
      .limit(20)
      .populate("media");

    socket.emit("loadMessages", messages.reverse());

    // Notify everyone of current online users
    updateOnlineUsers(io, room);
  } catch (err) {
    console.error("Error in joinRoom:", err);
    socket.emit("join-error", { message: "Failed to join room" });
  }
}

function handleTyping(socket, { username, typing }) {
  const user = onlineUsers.get(socket.id);
  if (user) socket.to(user.room).emit("typing_status", { username, typing });
}

async function handleChat(socket, io, msg) {
  const user = onlineUsers.get(socket.id);
  if (!user || user.room !== msg.room) return;

  try {
    const mediaIds = await uploadMedia(msg.media, user);

    const newMessage = await Message.create({
      username: msg.username,
      roomId: msg.room,
      message: msg.message || "",
      timestamp: msg.timestamp,
      media: mediaIds,
    });
    // console.log("messsssageeee::::");

    const mediaDocs = await Media.find({ _id: { $in: mediaIds } });
    io.to(msg.room).emit("chat message", {
      ...msg,
      _id: newMessage._id,
      media: mediaDocs.map((m) => ({ url: m.url, type: m.type })),
    });
  } catch (err) {
    console.error("Error handling chat message:", err);
    socket.emit("chat-error", { message: "Failed to send message" });
  }
}

async function uploadMedia(media, user) {
  if (!media || typeof media !== "object") return [];
  const { base64, type } = media;
  const match = base64.match(/^data:(.+);base64,(.+)$/);
  if (!match) return [];

  if (type === "image") {
    const doc = await Media.create({ url: base64, type, uploadedBy: user._id });
    return [doc._id];
  } else if (type === "video") {
    const uploaded = await cloudinary.uploader.upload(base64, {
      resource_type: "video",
    });
    const doc = await Media.create({
      url: uploaded.secure_url,
      type,
      uploadedBy: user._id,
    });
    return [doc._id];
  }

  return [];
}

async function handleDelete(socket, io, { _id }) {
  const user = onlineUsers.get(socket.id);
  if (!user) return;

  try {
    const message = await Message.findById(_id);
    if (!message) return;

    if (message.username === user.username) {
      await Message.findByIdAndDelete(_id);
      io.to(user.room).emit("message-deleted", { _id });
    } else {
      socket.emit("delete-error", {
        message: "You can't delete other's messages",
      });
    }
  } catch (err) {
    console.error("Error deleting message:", err);
    socket.emit("delete-error", { message: "Failed to delete message." });
  }
}

function handleDisconnect(socket, io) {
  const user = onlineUsers.get(socket.id);
  if (!user) return;

  socket.broadcast.to(user.room).emit("user_left", user.username);
  onlineUsers.delete(socket.id);
  updateOnlineUsers(io, user.room);
  console.log(`${user.username} disconnected from ${user.room}`);
}

function updateOnlineUsers(io, room) {
  const users = Array.from(onlineUsers.values())
    .filter((u) => u.room === room)
    .map((u) => u.username);
  io.to(room).emit("userOnline", { onlineUsers: users });
}

module.exports = initializeSocket;
