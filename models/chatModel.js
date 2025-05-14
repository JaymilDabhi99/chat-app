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
    required: true
   },
   timestamp: {
    type: String,
    default: Date.now
   },
   
});

module.exports = mongoose.model("Message", messageSchema);