const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { chat, getChatHistory, addFoodFromAI, addWorkoutFromAI, clearHistory } = require('../controllers/ai.controller');

router.use(authenticate);

router.post('/chat', chat);
router.get('/history', getChatHistory);
router.post('/add-food', addFoodFromAI);
router.post('/add-workout', addWorkoutFromAI);
router.delete('/history', clearHistory);

module.exports = router;
