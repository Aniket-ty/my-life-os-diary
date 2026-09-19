const prisma = require('../config/database');

/**
 * Batch sync endpoint: flushes offline-created items to the database
 * Supports diary entries, todos, workouts (with exercises), and expenses.
 */
exports.batchSync = async (req, res) => {
  const userId = req.user.id;
  const { diaryEntries = [], todos = [], workouts = [], expenses = [] } = req.body;

  const results = {
    diaryEntries: [],
    todos: [],
    workouts: [],
    expenses: [],
  };

  try {
    // 1. Sync Diary Entries
    for (const item of diaryEntries) {
      try {
        const created = await prisma.diaryEntry.create({
          data: {
            userId,
            title: item.title || null,
            content: item.content || '',
            mood: item.mood || null,
            weather: item.weather || null,
            entryDate: item.entryDate ? new Date(item.entryDate) : new Date(),
            isPinned: Boolean(item.isPinned),
          },
        });
        results.diaryEntries.push({
          localId: item.localId || item.id,
          serverId: created.id,
          status: 'synced',
        });
      } catch (err) {
        results.diaryEntries.push({
          localId: item.localId || item.id,
          status: 'error',
          error: err.message,
        });
      }
    }

    // 2. Sync To-Dos
    for (const item of todos) {
      try {
        const created = await prisma.todo.create({
          data: {
            userId,
            title: item.title || 'Untitled Task',
            description: item.description || null,
            category: item.category || null,
            priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium',
            isCompleted: Boolean(item.isCompleted),
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
            reminderAt: item.reminderAt ? new Date(item.reminderAt) : null,
          },
        });
        results.todos.push({
          localId: item.localId || item.id,
          serverId: created.id,
          status: 'synced',
        });
      } catch (err) {
        results.todos.push({
          localId: item.localId || item.id,
          status: 'error',
          error: err.message,
        });
      }
    }

    // 3. Sync Workouts
    for (const item of workouts) {
      try {
        const exercisesData = Array.isArray(item.exercises)
          ? item.exercises.map((ex, idx) => ({
              exerciseName: ex.exerciseName || ex.name || 'Exercise',
              sets: Number(ex.sets) || 3,
              reps: String(ex.reps || '10'),
              weightKg: ex.weightKg ? Number(ex.weightKg) : null,
              orderIndex: idx,
            }))
          : [];

        const created = await prisma.workout.create({
          data: {
            userId,
            name: item.name || item.title || 'Workout',
            workoutDate: item.workoutDate ? new Date(item.workoutDate) : new Date(),
            status: item.status === 'planned' ? 'planned' : 'completed',
            durationMin: item.durationMin ? Number(item.durationMin) : null,
            notes: item.notes || null,
            totalCaloriesBurned: item.totalCaloriesBurned ? Number(item.totalCaloriesBurned) : null,
            exercises: exercisesData.length > 0 ? { create: exercisesData } : undefined,
          },
          include: { exercises: true },
        });

        results.workouts.push({
          localId: item.localId || item.id,
          serverId: created.id,
          status: 'synced',
        });
      } catch (err) {
        results.workouts.push({
          localId: item.localId || item.id,
          status: 'error',
          error: err.message,
        });
      }
    }

    // 4. Sync Expenses
    for (const item of expenses) {
      try {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { defaultCurrency: true } });
        const currency = item.currency || user?.defaultCurrency || 'INR';
        const amount = Number(item.amount);

        if (!isNaN(amount) && amount > 0) {
          const created = await prisma.expense.create({
            data: {
              userId,
              amount,
              currency,
              amountInBase: amount,
              description: item.description || item.title || 'Expense',
              category: item.category || 'Other',
              date: item.date ? new Date(item.date) : new Date(),
              paymentMethod: item.paymentMethod || 'other',
            },
          });
          results.expenses.push({
            localId: item.localId || item.id,
            serverId: created.id,
            status: 'synced',
          });
        }
      } catch (err) {
        results.expenses.push({
          localId: item.localId || item.id,
          status: 'error',
          error: err.message,
        });
      }
    }

    return res.json({
      success: true,
      message: 'Offline queue batch synchronized successfully',
      syncedAt: new Date().toISOString(),
      results,
    });
  } catch (err) {
    console.error('Batch sync error:', err);
    return res.status(500).json({ error: 'Failed to process batch sync' });
  }
};

/**
 * Get snapshot of all user modules for offline caching
 */
exports.getSnapshot = async (req, res) => {
  const userId = req.user.id;

  try {
    const [diaryEntries, todos, workouts, expenses, fitnessGoals] = await Promise.all([
      prisma.diaryEntry.findMany({
        where: { userId },
        orderBy: { entryDate: 'desc' },
        take: 50,
      }),
      prisma.todo.findMany({
        where: { userId },
        orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
        take: 100,
      }),
      prisma.workout.findMany({
        where: { userId },
        include: { exercises: true },
        orderBy: { workoutDate: 'desc' },
        take: 30,
      }),
      prisma.expense.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 50,
      }),
      prisma.fitnessGoal.findUnique({
        where: { userId },
      }),
    ]);

    return res.json({
      timestamp: new Date().toISOString(),
      diaryEntries,
      todos,
      workouts,
      expenses,
      fitnessGoals,
    });
  } catch (err) {
    console.error('Snapshot fetch error:', err);
    return res.status(500).json({ error: 'Failed to retrieve snapshot' });
  }
};
