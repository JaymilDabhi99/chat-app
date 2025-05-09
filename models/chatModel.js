const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
   participants: [
     {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
     }
   ],
   sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
   },
   receiver_id: {
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
   }
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);