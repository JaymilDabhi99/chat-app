const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
   username: {
    type: String,
    required: true
   },
   roomId: {
    type: Number,
    required: true
   },
   message: {
    type: String,
   },
   timestamp: {
    type: String,
    default: Date.now
   },
   media: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
   }],
   
});

module.exports = mongoose.model("Message", messageSchema);