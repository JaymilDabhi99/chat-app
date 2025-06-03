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
const messageReactions = {};

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
    socket.on("react-message", (data) => handleReactMessage(socket, io, data));
    socket.on("message-seen", (data) => handleMessageSeen(socket, data));
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

    for (const [id, userInfo] of onlineUsers.entries()) {
      if (userInfo.username === msg.username && userInfo.room === msg.room) {
        io.to(id).emit("message-delivered", {
          messageId: saved._id,
          status: "Delivered",
        });
        break;
      }
    }
  } catch (err) {
    console.error("Error handling chat message:", err);
    socket.emit("chat-error", { message: "Failed to send message" });
  }
}

async function handleMessageSeen(socket, { messageId, sender }) {
  const user = onlineUsers.get(socket.id);
  if (!user || !messageId || !sender) return;

  // Find the sender's socketId and notify them
  for (const [id, info] of onlineUsers.entries()) {
    if (info.username === sender && info.room === user.room) {
      socket.to(id).emit("message-seen", {
        messageId,
        status: "Seen",
      });
      break;
    }
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
    // Initialize if not exists
    if (!messageReactions[messageId]) {
      messageReactions[messageId] = {};
    }
    if (!messageReactions[messageId][emoji]) {
      messageReactions[messageId][emoji] = [];
    }

    const userIndex = messageReactions[messageId][emoji].indexOf(username);

    // Toggle logic: add or remove
    if (userIndex === -1) {
      messageReactions[messageId][emoji].push(username);
    } else {
      messageReactions[messageId][emoji].splice(userIndex, 1);
      if (messageReactions[messageId][emoji].length === 0) {
        delete messageReactions[messageId][emoji];
      }
    }

    // Persist to DB
    const flattenedReactions = [];
    for (const [emoji, users] of Object.entries(messageReactions[messageId])) {
      for (const reactedBy of users) {
        flattenedReactions.push({ emoji, reactedBy });
      }
    }

    await Message.findByIdAndUpdate(messageId, {
      reactions: flattenedReactions,
    });

    // Emit updated reaction
    io.emit("reaction updated", {
      messageId,
      reactions: messageReactions[messageId],
      userReactions: Object.keys(messageReactions[messageId]).filter((em) =>
        messageReactions[messageId][em].includes(username)
      ),
    });
  } catch (err) {
    console.error("Error in handleReactMessage:", err);
    socket.emit("reaction-error", { message: "Failed to update reaction" });
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
