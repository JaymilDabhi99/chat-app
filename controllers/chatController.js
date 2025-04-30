const { join } = require("path");

const homeController = (req, res) => {
  res.sendFile(join(__dirname, "../public/homepage.html"));
};

const chatController = (req, res) => {
  res.sendFile(join(__dirname, "../public/chat.html"));
};

module.exports = {
  homeController,
  chatController,
};
