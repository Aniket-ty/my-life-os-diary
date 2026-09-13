const prisma = require('../config/database');

// ── Workouts ──────────────────────────────────────────────

const getWorkouts = async (req, res) => {
  try {
    const { date, status } = req.query;
    const where = { userId: req.user.id };
    if (date) where.workoutDate = new Date(date);
    if (status) where.status = status;

    const workouts = await prisma.workout.findMany({
      where,
      include: { exercises: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { workoutDate: 'desc' },
    });
    res.json(workouts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getWorkout = async (req, res) => {
  try {
    const workout = await prisma.workout.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { exercises: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!workout) return res.status(404).json({ error: 'Workout not found' });
    res.json(workout);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const createWorkout = async (req, res) => {
  try {
    const { name, workoutDate, status, durationMin, notes, exercises } = req.body;
    if (!name) return res.status(400).json({ error: 'Workout name is required' });

    const workout = await prisma.workout.create({
      data: {
        userId: req.user.id,
        name,
        workoutDate: workoutDate ? new Date(workoutDate) : new Date(),
        status: status || 'planned',
        durationMin,
        notes,
        exercises: exercises?.length
          ? {
              create: exercises.map((ex, i) => ({
                exerciseName: ex.exerciseName,
                sets: ex.sets,
                reps: ex.reps != null ? String(ex.reps) : null,
                weightKg: ex.weightKg,
                durationSec: ex.durationSec,
                distanceKm: ex.distanceKm,
                orderIndex: i,
              })),
            }
          : undefined,
      },
      include: { exercises: true },
    });
    res.status(201).json(workout);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const updateWorkout = async (req, res) => {
  try {
    const existing = await prisma.workout.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Workout not found' });

    const { name, status, durationMin, notes, totalCaloriesBurned } = req.body;
    const workout = await prisma.workout.update({
      where: { id: req.params.id },
      data: { name, status, durationMin, notes, totalCaloriesBurned },
      include: { exercises: true },
    });
    res.json(workout);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const deleteWorkout = async (req, res) => {
  try {
    const existing = await prisma.workout.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Workout not found' });
    await prisma.workout.delete({ where: { id: req.params.id } });
    res.json({ message: 'Workout deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const addExercises = async (req, res) => {
  try {
    const workout = await prisma.workout.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { exercises: true },
    });
    if (!workout) return res.status(404).json({ error: 'Workout not found' });

    const { exercises } = req.body;
    if (!exercises?.length) return res.status(400).json({ error: 'exercises array is required' });

    const startIndex = workout.exercises.length;
    const created = await prisma.$transaction(
      exercises.map((ex, i) =>
        prisma.workoutExercise.create({
          data: {
            workoutId: req.params.id,
            exerciseName: ex.exerciseName,
            sets: ex.sets,
            reps: ex.reps != null ? String(ex.reps) : null,
            weightKg: ex.weightKg,
            durationSec: ex.durationSec,
            distanceKm: ex.distanceKm,
            orderIndex: startIndex + i,
          },
        })
      )
    );
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const deleteExercise = async (req, res) => {
  try {
    const exercise = await prisma.workoutExercise.findFirst({
      where: { id: req.params.exerciseId },
      include: { workout: true },
    });
    if (!exercise || exercise.workout.userId !== req.user.id) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    await prisma.workoutExercise.delete({ where: { id: req.params.exerciseId } });
    res.json({ message: 'Exercise deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Nutrition ─────────────────────────────────────────────

const getNutrition = async (req, res) => {
  try {
    const { date } = req.query;
    const logDate = date ? new Date(date) : new Date();

    const logs = await prisma.nutritionLog.findMany({
      where: { userId: req.user.id, logDate },
      orderBy: { createdAt: 'asc' },
    });
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const logFood = async (req, res) => {
  try {
    const { foodName, mealType, calories, proteinG, carbsG, fatG, quantity, logDate, aiSuggested } = req.body;
    if (!foodName || !calories || !mealType) {
      return res.status(400).json({ error: 'foodName, calories and mealType are required' });
    }

    const log = await prisma.nutritionLog.create({
      data: {
        userId: req.user.id,
        foodName,
        mealType,
        calories: Number(calories),
        proteinG: proteinG ? Number(proteinG) : null,
        carbsG: carbsG ? Number(carbsG) : null,
        fatG: fatG ? Number(fatG) : null,
        quantity,
        logDate: logDate ? new Date(logDate) : new Date(),
        aiSuggested: aiSuggested || false,
      },
    });
    res.status(201).json(log);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const deleteFood = async (req, res) => {
  try {
    const log = await prisma.nutritionLog.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!log) return res.status(404).json({ error: 'Log not found' });
    await prisma.nutritionLog.delete({ where: { id: req.params.id } });
    res.json({ message: 'Food log deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getDailySummary = async (req, res) => {
  try {
    const { date } = req.query;
    const logDate = date ? new Date(date) : new Date();

    const logs = await prisma.nutritionLog.findMany({
      where: { userId: req.user.id, logDate },
    });

    const goals = await prisma.fitnessGoal.findUnique({
      where: { userId: req.user.id },
    });

    const totals = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        proteinG: acc.proteinG + Number(log.proteinG || 0),
        carbsG: acc.carbsG + Number(log.carbsG || 0),
        fatG: acc.fatG + Number(log.fatG || 0),
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );

    // Group by meal type
    const byMeal = logs.reduce((acc, log) => {
      if (!acc[log.mealType]) acc[log.mealType] = [];
      acc[log.mealType].push(log);
      return acc;
    }, {});

    res.json({
      date: logDate,
      totals,
      goals: goals || null,
      remaining: goals
        ? {
            calories: (goals.dailyCalories || 0) - totals.calories,
            proteinG: Number(goals.proteinG || 0) - totals.proteinG,
          }
        : null,
      byMeal,
      logCount: logs.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Goals ─────────────────────────────────────────────────

const getGoals = async (req, res) => {
  try {
    const goals = await prisma.fitnessGoal.findUnique({
      where: { userId: req.user.id },
    });
    res.json(goals || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const upsertGoals = async (req, res) => {
  try {
    const { dailyCalories, proteinG, carbsG, fatG } = req.body;
    const goals = await prisma.fitnessGoal.upsert({
      where: { userId: req.user.id },
      update: { dailyCalories, proteinG, carbsG, fatG },
      create: { userId: req.user.id, dailyCalories, proteinG, carbsG, fatG },
    });
    res.json(goals);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getWorkouts, getWorkout, createWorkout, updateWorkout,
  deleteWorkout, addExercises, deleteExercise,
  getNutrition, logFood, deleteFood, getDailySummary,
  getGoals, upsertGoals,
};
