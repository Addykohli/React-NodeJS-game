// server/routes/sessionRoutes.js

const express     = require('express');
const router      = express.Router();
const mongoose    = require('mongoose');
const GameSession = require('../models/GameSession');

// @route   POST /api/sessions
// @desc    Create a new game session
// @access  Public (or protect as you see fit)
router.post('/', async (req, res) => {
  try {
    const session = new GameSession(req.body);
    await session.save();
    res.status(201).json(session);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// @route   GET /api/sessions
// @desc    List all sessions
// @access  Public
router.get('/', async (req, res) => {
  try {
    const sessions = await GameSession.find().sort('-createdAt');
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/sessions/:id
// @desc    Get a single session by ID
// @access  Public
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }
  try {
    const session = await GameSession.findById(id);
    if (!session) return res.status(404).json({ error: 'Not found' });
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/sessions/:id
// @desc    Update a session (e.g. history or currentPlayerIndex)
// @access  Public
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }
  try {
    const updated = await GameSession.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// @route   DELETE /api/sessions/:id
// @desc    Delete a session
// @access  Public
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }
  try {
    const deleted = await GameSession.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Session deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
