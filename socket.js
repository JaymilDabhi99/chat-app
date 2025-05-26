require('dotenv').config();
const socket = require("socket.io");
const cloudinary = require("cloudinary").v2;

const Message = require("./models/chatModel");
const Media = require("./models/mediaModel");

const initializeSocket = (server) => {
  const io = socket(server, {
    maxHttpBufferSize: 1e7,
    cors: {
      origin: "*",
      methods: ['GET', 'POST']
    },
  });
  // console.log("process:", process.env);
  // const cloud_name = process.env.cloud_name;
  // const api_key = process.env.api_key;
  // const api_secret = process.env.api_secret;
  cloudinary.config({
    cloud_name: process.env.cloud_name,
    api_key: process.env.api_key,
    api_secret: process.env.api_secret
    // cloud_name,
    // api_key,
    // api_secret  
  })

  const onlineUsers = [];

  io.on("connection", (socket) => {
    // console.log('User connected:', socket.id);
    
    socket.on("joinRoom", async ({ username, room }) => {
      
      socket.join(room);
      socket.username = username;
      socket.room = room;
      
      onlineUsers[socket.id] = { username, room };

      const messages = await Message.find({ roomId: room }).sort({ _id: -1 }).limit(20).populate("media");
      socket.emit("loadMessages", messages.reverse());

      socket.broadcast.to(room).emit("user_join", username);
      
      const usersInRoom = Object.values(onlineUsers).filter(u => u.room === room).map(u => u.username);
      io.to(room).emit("userOnline", { onlineUsers: usersInRoom });
      // console.log(`${username} joined room: ${room}`);

    });

    socket.on("typing", (data) => {
      const user = onlineUsers[socket.id];
      if(user){
        socket.to(user.room).emit('typing_status', data);
      }
    });
    

    socket.on("chat message", async (msg) => {
      // console.log("SERVER: Received chat message", msg);
      const user = onlineUsers[socket.id];
      if(!user && user.room !== msg.room) return;
        let mediaIds = [];

        try {
          if(msg.media && typeof msg.media === 'object'){
          const { base64, type } = msg.media;
        //  console.log("Received media:", msg.media);

          // console.log("Type: ",type);

          const matches = base64.match(/^data:(.+);base64,(.+)$/);
          if(matches && matches.length === 3) {
            if(type === 'image'){
              const mediaDoc = await Media.create({
                url: base64,
                type,
                uploadedBy: user._id,
              });
              mediaIds.push(mediaDoc._id);
            }else if(type === 'video'){
              const uploadedVideo = await cloudinary.uploader.upload(base64, {
                resource_type: "video"
              });
              // console.log("process:", process.env);
              // console.log("Cloudinary upload result:", uploadedVideo);


              const mediaDoc = await Media.create({
                url: uploadedVideo.secure_url,
                type,
                uploadedBy: user._id,
              });
              mediaIds.push(mediaDoc._id);
            }
          }
        }

        const newMsg = await Message.create({
          username: msg.username,
          roomId: msg.room,
          message: msg.message,
          timestamp: msg.timestamp,
          media: mediaIds,
        });
        const mediaDocs = await Media.find({ _id: { $in: mediaIds } });
        io.to(msg.room).emit("chat message", {
          ...msg,
          media: mediaDocs.map(m => ({ url: m.url, type: m.type })),
        });
        } catch (error) {
          console.error("Error handling chat message:", error);
          socket.emit("chat-error", {
            message: "Failed to send message. Please try again.",
          });
        }
      
    });

    socket.on('delete-message', async ({ _id }) => {
      const user = onlineUsers[socket.id];
      if(!user) return;
      try {
        const message = await Message.findById(_id);
        if(!message) return;

        if(message.username === user.username){
          await Message.findByIdAndDelete(_id);
          io.to(user.room).emit('message-deleted', { _id });
        }else{
          socket.emit('delete-error', { message: "You can't delete messages from other users" });
        }
      } catch (error) {
        console.error("Error deleting message", error);
        socket.emit('delete-error', { message: "Failed to delete message." });
      }
      
    });
    

    socket.on("disconnect", () => {
      const user = onlineUsers[socket.id];
      if (user) {
        const { username, room } = user;
        // delete onlineUsers[socket.id];
        socket.broadcast.to(user.room).emit("user_left", user.username);
        delete onlineUsers[socket.id];

        const usersInRoom = Object.values(onlineUsers).filter(u => u.room === user.room).map(u => u.username);
        io.to(room).emit("userOnline", { onlineUsers: usersInRoom });

        // console.log(`${user.username} disconnected from room ${user.room}`);
      }
    });
  });
};

module.exports = initializeSocket;
