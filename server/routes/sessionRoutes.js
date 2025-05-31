// server/routes/sessionRoutes.js

const express = require('express');
const router = express.Router();
const GameSession = require('../models/GameSession');

// @route   POST /api/sessions
// @desc    Create a new game session
// @access  Public (or protect as you see fit)
router.post('/', async (req, res) => {
  try {
    const session = await GameSession.create(req.body);
    res.status(201).json(session);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   GET /api/sessions
// @desc    List all sessions
// @access  Public
router.get('/', async (req, res) => {
  try {
    const sessions = await GameSession.findAll();
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/sessions/:id
// @desc    Get a single session by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const session = await GameSession.findByPk(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   PUT /api/sessions/:id
// @desc    Update a session (e.g. history or currentPlayerIndex)
// @access  Public
router.patch('/:id', async (req, res) => {
  try {
    const [updated] = await GameSession.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedSession = await GameSession.findByPk(req.params.id);
      return res.json(updatedSession);
    }
    throw new Error('Session not found');
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   DELETE /api/sessions/:id
// @desc    Delete a session
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await GameSession.destroy({
      where: { id: req.params.id }
    });
    if (deleted) {
      return res.json({ message: 'Session deleted' });
    }
    throw new Error('Session not found');
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
