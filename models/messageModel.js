const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
   participants: [
     {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
     }
   ],
   sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
   },
   receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
   },
   group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
   },
   message: {
    type: String,
    required: true
   },
   timestamp: {
    type: Date,
    default: Date.now
   }
});

module.exports = mongoose.model("Message", messageSchema);