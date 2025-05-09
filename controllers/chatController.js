const { join } = require("path");
const { ChatMessage } = require("../models/chatModel");

const chatController = (req, res) => {
  // const socket = io();
  res.sendFile(join(__dirname, "../public/chat.html"));

  const sendChat = async (req, res) => {
    try {
      const chatMessage = ChatMessage({
       sender_id: req.body.sender_user_id,
       receiver_id: req.body.receiver_user_id,
       chat_message: req.body.msg
      });
 
      await chatMessage.save();
 
      res.status(200).json({
       status: "success",
       message: "Message sent successfully",
       data: chatMessage,
      });
   } catch (error) {
     console.error("Error: ", error);
   }
  }


  const fetchChat = async (req, res) => {
    try {
      const { sender_user_id, receiver_user_id } = req.body;
      const query = {
        $or: [
          {
            $and: [
              {
                sender_id: sender_user_id,
              },
              {
                receiver_id: receiver_user_id
              }
            ]
          },
          {
            $and: [
              {
                sender_id: receiver_user_id
              },
              {
                receiver_id: sender_user_id
              }
            ]
          }
        ]
      }
    } catch (error) {
      console.error("Error: ", error);
    }
  }

  
  
};

module.exports = {
  chatController,
};
