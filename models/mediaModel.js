const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
   url: String,
   type: {
    type: String,
    enum: ['image','video'],
   },
   uploadedBy: String,
   uploadedAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model("Media", mediaSchema);