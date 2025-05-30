// server/models/GameSession.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Snapshot of a single player's state at a moment in time
const playerSnapshotSchema = new Schema({
  socketId:   String,
  name:       String,
  piece:      String,
  tileId:     Number,
  prevTile:   Number,
  money:      Number,
  loan:       { type: Number, default: 0 },
  properties: [String],
  ready:      Boolean
}, { _id: false });

// A single move within a session
const moveSchema = new Schema({
  playerSocketId: { type: String, required: true },
  die1:           Number,
  die2:           Number,
  fromTile:       Number,
  toTile:         Number,
  timestamp:      { type: Date, default: Date.now }
}, { _id: false });

const gameSessionSchema = new Schema({
  players:            [playerSnapshotSchema],
  currentPlayerIndex: { type: Number, default: 0 },
  moves:              [moveSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('GameSession', gameSessionSchema);
