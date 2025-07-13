const express = require('express');
const router = express.Router();
const { Player } = require('../models');

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

router.get('/', async (req, res) => {
  try {
    const players = await Player.findAll();
    res.json(players);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findOne({
      where: { socketId: req.params.id }
    });
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    res.json(player);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const [updated] = await Player.update(req.body, {
      where: { socketId: req.params.id }
    });
    if (updated) {
      const updatedPlayer = await Player.findOne({
        where: { socketId: req.params.id }
      });
      return res.json(updatedPlayer);
    }
    throw new Error('Player not found');
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:socketId', async (req, res) => {
  try {
    const { socketId } = req.params;
    await Player.findOneAndDelete({ socketId });
    res.json({ message: `Player ${socketId} removed` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/clear', async (req, res) => {
  try {
    await Player.deleteMany({});
    res.json({ message: 'All players cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/join', async (req, res) => {
  const { name } = req.body;
  
  try {
    const existingPlayer = await Player.findOne({
      where: { name, isConnected: false }
    });

    if (existingPlayer) {
      const [updatedRows] = await Player.update(
        { isConnected: true },
        { where: { id: existingPlayer.id } }
      );

      if (updatedRows === 0) {
        return res.status(500).json({ error: 'Failed to update player' });
      }

      return res.json({
        ...existingPlayer.toJSON(),
        isConnected: true
      });
    }

    const newPlayer = await Player.create({
      name,
      isConnected: true,
      money: 10000,
      properties: [],
      tileId: 1,
      hasMoved: false
    });

    res.json(newPlayer);
  } catch (error) {
    console.error('Error in /join:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
