// server/routes/playerRoutes.js
const express = require('express');
const router = express.Router();
const Player = require('../models/Player');

// Create or update a player (upsert by socketId)
router.post('/', async (req, res) => {
  try {
    const { socketId, name, piece, tileId, prevTile, money, properties, ready } = req.body;
    const player = await Player.findOneAndUpdate(
      { socketId },
      { socketId, name, piece, tileId, prevTile, money, properties, ready },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json(player);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all players
router.get('/', async (req, res) => {
  try {
    const players = await Player.find().sort({ createdAt: 1 });
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a single player by socketId
router.delete('/:socketId', async (req, res) => {
  try {
    const { socketId } = req.params;
    await Player.findOneAndDelete({ socketId });
    res.json({ message: `Player ${socketId} removed` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all players (e.g. when lobby resets)
router.delete('/clear', async (req, res) => {
  try {
    await Player.deleteMany({});
    res.json({ message: 'All players cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
