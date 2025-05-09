const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    require: true,
  },
  isOnline: {
    type: String,
    default: '0',
  },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
