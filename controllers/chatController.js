const { join } = require("path");


const chatController = (req, res) => {
  res.sendFile(join(__dirname, "../public/chat.html"));

  
};

module.exports = {
  chatController,
};
