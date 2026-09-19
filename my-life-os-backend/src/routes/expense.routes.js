const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/summary', expenseController.getExpenseSummary);
router.get('/categories', expenseController.getCategories);
router.get('/export/csv', expenseController.exportExpensesCsv);
router.get('/', expenseController.getExpenses);
router.post('/', expenseController.createExpense);
router.get('/:id', expenseController.getExpenseById);
router.put('/:id', expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
