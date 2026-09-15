const prisma = require('../config/database');

// ── Workout Plans CRUD ──────────────────────────────────────

const getPlans = async (req, res) => {
  try {
    const plans = await prisma.workoutPlan.findMany({
      where: { userId: req.user.id },
      include: { days: { orderBy: { dayNumber: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(plans);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getActivePlan = async (req, res) => {
  try {
    const plan = await prisma.workoutPlan.findFirst({
      where: { userId: req.user.id, isActive: true },
      include: { days: { orderBy: { dayNumber: 'asc' } } },
    });
    res.json(plan || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const createPlan = async (req, res) => {
  try {
    const { name, goal, fitnessLevel, equipment, daysPerWeek, days, generatedByAI } = req.body;
    if (!name) return res.status(400).json({ error: 'Plan name is required' });

    const plan = await prisma.workoutPlan.create({
      data: {
        userId: req.user.id,
        name,
        goal,
        fitnessLevel,
        equipment: equipment || [],
        daysPerWeek: daysPerWeek || 5,
        generatedByAI: generatedByAI || false,
        days: days?.length
          ? {
              create: days.map((d) => ({
                dayNumber: d.dayNumber,
                workoutName: d.workoutName,
                muscleGroup: d.muscleGroup,
                exercises: d.exercises || [],
                restDay: d.restDay || false,
                notes: d.notes,
              })),
            }
          : undefined,
      },
      include: { days: { orderBy: { dayNumber: 'asc' } } },
    });
    res.status(201).json(plan);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const updatePlan = async (req, res) => {
  try {
    const existing = await prisma.workoutPlan.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Plan not found' });

    const { name, goal, fitnessLevel, equipment, daysPerWeek, isActive } = req.body;

    // If activating this plan, deactivate others
    if (isActive && !existing.isActive) {
      await prisma.workoutPlan.updateMany({
        where: { userId: req.user.id, isActive: true },
        data: { isActive: false },
      });
    }

    const plan = await prisma.workoutPlan.update({
      where: { id: req.params.id },
      data: { name, goal, fitnessLevel, equipment, daysPerWeek, isActive },
      include: { days: { orderBy: { dayNumber: 'asc' } } },
    });
    res.json(plan);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const deletePlan = async (req, res) => {
  try {
    const existing = await prisma.workoutPlan.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Plan not found' });
    await prisma.workoutPlan.delete({ where: { id: req.params.id } });
    res.json({ message: 'Plan deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Update a specific day ───────────────────────────────────

const updatePlanDay = async (req, res) => {
  try {
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const day = await prisma.workoutPlanDay.findFirst({
      where: { id: req.params.dayId, planId: req.params.id },
    });
    if (!day) return res.status(404).json({ error: 'Day not found' });

    const { workoutName, muscleGroup, exercises, restDay, notes } = req.body;

    const updated = await prisma.workoutPlanDay.update({
      where: { id: req.params.dayId },
      data: { workoutName, muscleGroup, exercises, restDay, notes },
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ── Apply a plan day to create actual workout entries ────────

const applyPlanDay = async (req, res) => {
  try {
    const plan = await prisma.workoutPlan.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const day = await prisma.workoutPlanDay.findFirst({
      where: { id: req.params.dayId, planId: req.params.id },
    });
    if (!day) return res.status(404).json({ error: 'Day not found' });
    if (day.restDay) return res.status(400).json({ error: 'Cannot apply a rest day' });

    const { date } = req.body;
    const workoutDate = date ? new Date(date) : new Date();

    // Parse exercises from the JSON field
    const exercisesData = Array.isArray(day.exercises) ? day.exercises : [];

    const workout = await prisma.workout.create({
      data: {
        userId: req.user.id,
        name: day.workoutName || 'Workout',
        workoutDate,
        status: 'planned',
        notes: day.notes,
        exercises: exercisesData.length
          ? {
              create: exercisesData.map((ex, i) => ({
                exerciseName: ex.name || ex.exerciseName || 'Exercise',
                sets: ex.sets || null,
                reps: ex.reps != null ? String(ex.reps) : null,
                weightKg: ex.weightKg || null,
                durationSec: ex.durationSec || null,
                distanceKm: ex.distanceKm || null,
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

module.exports = {
  getPlans, getActivePlan, createPlan, updatePlan, deletePlan,
  updatePlanDay, applyPlanDay,
};
