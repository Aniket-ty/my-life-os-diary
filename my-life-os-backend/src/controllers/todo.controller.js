const prisma = require('../config/database');

const getTodos = async (req, res) => {
  try {
    const { category, completed } = req.query;
    const where = { userId: req.user.id };
    if (category) where.category = category;
    if (completed !== undefined) where.isCompleted = completed === 'true';

    const todos = await prisma.todo.findMany({
      where,
      orderBy: [{ isCompleted: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(todos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const createTodo = async (req, res) => {
  try {
    const { title, description, category, priority, dueDate, reminderAt, isRecurring, recurPattern } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const todo = await prisma.todo.create({
      data: {
        userId: req.user.id,
        title,
        description,
        category,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        reminderAt: reminderAt ? new Date(reminderAt) : null,
        isRecurring: isRecurring || false,
        recurPattern,
      },
    });
    res.status(201).json(todo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const updateTodo = async (req, res) => {
  try {
    const existing = await prisma.todo.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Todo not found' });

    const { title, description, category, priority, dueDate, reminderAt, isRecurring, recurPattern } = req.body;
    const todo = await prisma.todo.update({
      where: { id: req.params.id },
      data: { title, description, category, priority, dueDate: dueDate ? new Date(dueDate) : undefined, reminderAt: reminderAt ? new Date(reminderAt) : undefined, isRecurring, recurPattern },
    });
    res.json(todo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const deleteTodo = async (req, res) => {
  try {
    const existing = await prisma.todo.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Todo not found' });
    await prisma.todo.delete({ where: { id: req.params.id } });
    res.json({ message: 'Todo deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const completeTodo = async (req, res) => {
  try {
    const existing = await prisma.todo.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Todo not found' });

    // Handle recurring: reset instead of completing
    if (existing.isRecurring && existing.recurPattern) {
      const next = getNextRecurDate(existing.dueDate, existing.recurPattern);
      const todo = await prisma.todo.update({
        where: { id: req.params.id },
        data: { dueDate: next, reminderAt: next, reminderSent: false },
      });
      return res.json({ message: 'Recurring task reset for next occurrence', todo });
    }

    const todo = await prisma.todo.update({
      where: { id: req.params.id },
      data: { isCompleted: true, completedAt: new Date() },
    });
    res.json(todo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const uncompleteTodo = async (req, res) => {
  try {
    const existing = await prisma.todo.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Todo not found' });
    const todo = await prisma.todo.update({
      where: { id: req.params.id },
      data: { isCompleted: false, completedAt: null },
    });
    res.json(todo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

function getNextRecurDate(currentDate, pattern) {
  const date = new Date(currentDate || new Date());
  switch (pattern) {
    case 'daily': date.setDate(date.getDate() + 1); break;
    case 'weekly': date.setDate(date.getDate() + 7); break;
    case 'weekdays':
      date.setDate(date.getDate() + 1);
      while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
      }
      break;
    default: date.setDate(date.getDate() + 1);
  }
  return date;
}

module.exports = { getTodos, createTodo, updateTodo, deleteTodo, completeTodo, uncompleteTodo };
