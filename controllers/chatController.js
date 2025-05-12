const { join } = require("path");
const { ChatMessage } = require("../models/chatModel");

const chatController = (req, res) => {
  // const socket = io();
  res.sendFile(join(__dirname, "../public/chat.html"));

};

module.exports = {
  chatController,
};
