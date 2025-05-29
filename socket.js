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

// In-memory stores
const onlineUsers = new Map(); //  socketId -> { username, room }
const disconnectTimers = new Map(); // socketId → timeoutId
const messages = new Map();

const persistentUser = {};

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
    socket.on("react-message", (data) => {
      // console.log("hitting react message:");
      handleReactMessage(socket, io, data);
    });
    socket.on("delete-message", (data) => handleDelete(socket, io, data));
    socket.on("disconnect", () => handleDisconnect(socket, io));
  });
}

async function handleJoinRoom(socket, io, { username, room } = {}) {
  try {
    const userKey = `${username}_${room}`;
    const wasAlreadyRoom = persistentUser[userKey];

    // Cancel any pending “left” event for this user
    for (const [oldId, user] of onlineUsers.entries()) {
      if (user.username === username && disconnectTimers.has(oldId)) {
        clearTimeout(disconnectTimers.get(oldId));
        disconnectTimers.delete(oldId);
        onlineUsers.delete(oldId);
        break;
      }
    }

    socket.join(room);
    socket.username = username;
    socket.room = room;
    onlineUsers.set(socket.id, { username, room });

    persistentUser[userKey] = true;

    // Notify others
    if (!wasAlreadyRoom) {
      socket.broadcast.to(room).emit("user_join", username);
    }

    console.log(`{username} joined room: ${room}`);

    // Load last 20 messages

    try {
      const messages = await Message.find({ roomId: room })
        .sort({ _id: -1 })
        .limit(20)
        .populate("media");
      socket.emit("loadMessages", messages.reverse());
    } catch (err) {
      console.error("Error loading messages:", err);
      socket.emit("loadMessages", []);
    }

    // Notify everyone of current online users
    updateOnlineUsers(io, room);
  } catch (err) {
    console.error("Error in joinRoom:", err);
    socket.emit("join-error", { message: "Failed to join room" });
  }
}

function handleTyping(socket, { username, typing } = {}) {
  const user = onlineUsers.get(socket.id);
  if (user && typeof typing === "boolean") {
    socket.to(user.room).emit("typing_status", { username, typing });
  }
}

async function handleChat(socket, io, msg = {}) {
  const user = onlineUsers.get(socket.id);
  if (!user || user.room !== msg.room) return;

  // Validate message
  const text = typeof msg.message === "string" ? msg.message.trim() : "";
  const media = msg.media;

  if (!text && !media) {
    return socket.emit("chat-error", { message: "Empty message." });
  }

  try {
    const mediaIds = await uploadMedia(media, user);

    const saved = await Message.create({
      username: msg.username,
      roomId: msg.room,
      message: text,
      timestamp: msg.timestamp,
      media: mediaIds,
    });
    // console.log("messsssageeee::::");

    const mediaDocs = await Media.find({ _id: { $in: mediaIds } });

    io.to(msg.room).emit("chat message", {
      _id: saved._id,
      username: msg.username,
      room: msg.room,
      message: text,
      timestamp: msg.timestamp,
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
  if (!base64 || !type) return [];

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

async function handleReactMessage(socket, io, { messageId, emoji, username }) {
  try {
    // 1. Toggle reaction atomically
    const hasReacted = await Message.exists({
      _id: messageId,
      reactions: { $elemMatch: { emoji, reactedBy: username } },
    });

    if (hasReacted) {
      await Message.updateOne(
        { _id: messageId },
        { $pull: { reactions: { emoji, reactedBy: username } } }
      );
    } else {
      await Message.updateOne(
        { _id: messageId },
        { $push: { reactions: { emoji, reactedBy: username } } }
      );
    }

    // 2. Fetch updated reactions array
    const { reactions = [], roomId } = await Message.findById(
      messageId,
      "reactions roomId"
    ).lean();

    // 3. Compute counts per emoji and whether this user has reacted
    const counts = reactions.reduce((acc, { emoji, reactedBy }) => {
      acc[emoji] = (acc[emoji] || 0) + 1;
      return acc;
    }, {});
    const userReactions = new Set(
      reactions.filter((r) => r.reactedBy === username).map((r) => r.emoji)
    );

    // 4. Broadcast: for each client we send the same data, they'll decide highlight
    io.to(roomId).emit("react-message", {
      messageId,
      counts, // { "👍": 3, "😂": 1, … }
      userReactions: Array.from(userReactions), // e.g. ["👍"]
    });
  } catch (err) {
    console.error("Error toggling reaction:", err);
  }
}

async function handleDelete(socket, io, { _id } = {}) {
  const user = onlineUsers.get(socket.id);
  if (!user || !_id) return;

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
  const currentUser = onlineUsers.get(socket.id);
  if (currentUser) {
    const timer = setTimeout(() => {
      // console.log("currentUser:", currentUser);
      const stillOnline = [...onlineUsers.values()].some(
        (user) =>
          user.username === currentUser.username &&
          user.room === currentUser.room
      );
      if (!stillOnline) {
        io.to(currentUser.room).emit("user_left", currentUser.username);
        delete persistentUser[`${currentUser.username}_{currentUser.room}`];
      }

      disconnectTimers.delete(socket.id);
    }, 3000);
    onlineUsers.delete(socket.id);
    disconnectTimers.set(socket.id, timer);
  }
}

function updateOnlineUsers(io, room) {
  const users = Array.from(onlineUsers.values())
    .filter((u) => u.room === room)
    .map((u) => u.username);
  io.to(room).emit("userOnline", { onlineUsers: users });
}

module.exports = initializeSocket;
