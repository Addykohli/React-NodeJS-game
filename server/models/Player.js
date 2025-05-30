// server/models/Player.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const playerSchema = new Schema({
  socketId:    { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  piece:       { type: String, default: null },
  tileId:      { type: Number, default: 1 },
  prevTile:    { type: Number, default: null },
  money:       { type: Number, default: 1500 },
  loan:        { type: Number, default: 0 },
  properties:  { type: [String], default: [] },
  ready:       { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Player', playerSchema);
