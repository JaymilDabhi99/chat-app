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
    
    socket.on("joinRoom", async ({ username, room }) => {
      console.log(`${username} joined room: ${room}`);

      socket.join(room);
      onlineUsers[socket.id] = { username, room };

      const messages = await Message.find({ roomId: room }).sort({ _id: -1 }).limit(20);
      socket.emit("loadMessages", messages.reverse());

      socket.to(room).emit("user-join", username);

      const usersInRoom = Object.values(onlineUsers).filter(u => u.room === room).map(u => u.username);
      io.to(room).emit("userOnline", { onlineUsers: usersInRoom });
    });

    socket.on("typing", (data) => {
      const user = onlineUsers[socket.id];
      if(user){
        socket.to(user.room).emit('typing_status', data);
      }
    });
    

    socket.on("chat message", async (msg) => {
      const user = onlineUsers[socket.id];
      if(user && user.room === msg.room){
        await Message.create({
          username: msg.username,
          roomId: msg.room,
          message: msg.message,
          timestamp: msg.timestamp,
        });
        io.to(msg.room).emit("chat message", msg);
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
        socket.to(user.room).emit("user-left", user.username);
        delete onlineUsers[socket.id];

        const usersInRoom = Object.values(onlineUsers).filter(u => u.room === user.room).map(u => u.username);
        io.to(user.room).emit("userOnline", { userOnline: usersInRoom });

        console.log(`${user.username} disconnected from room ${user.room}`);
      }
    });
  });
};

module.exports = initializeSocket;
