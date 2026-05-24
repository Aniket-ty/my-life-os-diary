const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getTodos, createTodo, updateTodo, deleteTodo, completeTodo, uncompleteTodo } = require('../controllers/todo.controller');

router.use(authenticate);

router.get('/', getTodos);
router.post('/', createTodo);
router.put('/:id', updateTodo);
router.delete('/:id', deleteTodo);
router.patch('/:id/complete', completeTodo);
router.patch('/:id/uncomplete', uncompleteTodo);

module.exports = router;
