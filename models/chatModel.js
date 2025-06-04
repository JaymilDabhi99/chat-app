const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  roomId: {
    type: Number,
    required: true,
  },
  message: {
    type: String,
  },
  timestamp: {
    type: String,
    default: Date.now,
  },
  media: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
    },
  ],
  reactions: [
    {
      emoji: String,
      reactedBy: String,
    },
  ],
  deliveredTo: [String],
  seenBy: [String],
});

module.exports = mongoose.model("Message", messageSchema);
