const prisma = require('../config/database');

/**
 * List / search exercises from the master catalog.
 */
const getExercises = async (req, res) => {
  try {
    const { q, muscle, equipmentId, difficulty, category } = req.query;

    const where = { isActive: true };

    if (muscle) {
      where.primaryMuscle = { contains: muscle, mode: 'insensitive' };
    }

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (difficulty) {
      where.difficultyLevel = { equals: difficulty, mode: 'insensitive' };
    }

    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    let exercises = await prisma.exercise.findMany({
      where,
      include: {
        equipment: {
          select: { id: true, name: true, category: true, imageUrl: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (q && q.trim()) {
      const query = q.trim().toLowerCase();
      const directMatches = exercises.filter((ex) => {
        const matchName = ex.name.toLowerCase().includes(query);
        const matchMuscle = ex.primaryMuscle?.toLowerCase().includes(query);
        const matchEquipment = ex.equipment?.name?.toLowerCase().includes(query);
        const matchTags = Array.isArray(ex.tags) && ex.tags.some((t) => t.toLowerCase().includes(query));
        return matchName || matchMuscle || matchEquipment || matchTags;
      });

      if (directMatches.length > 0) {
        exercises = directMatches;
      } else {
        // Token overlap fallback
        const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'with', 'and', 'for', 'of', 'machine']);
        const tokens = query.split(/[\s,_\-]+/).filter((w) => w.length > 2 && !stopWords.has(w));
        if (tokens.length > 0) {
          const scored = exercises
            .map((ex) => {
              const targetStr = `${ex.name} ${ex.primaryMuscle} ${ex.equipment?.name || ''} ${(ex.tags || []).join(' ')}`.toLowerCase();
              const score = tokens.reduce((acc, tok) => acc + (targetStr.includes(tok) ? 1 : 0), 0);
              return { ex, score };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score);

          if (scored.length > 0) {
            exercises = scored.map((s) => s.ex);
          }
        }
      }
    }

    res.json(exercises);
  } catch (err) {
    console.error('Error fetching exercises:', err);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
};

/**
 * Get complete exercise details by ID for the ExerciseDemo component.
 */
const getExerciseById = async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        equipment: true,
      },
    });

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    // Resolve alternatives if names exist
    let resolvedAlternatives = [];
    if (exercise.alternatives && exercise.alternatives.length > 0) {
      resolvedAlternatives = await prisma.exercise.findMany({
        where: {
          name: { in: exercise.alternatives },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          primaryMuscle: true,
          difficultyLevel: true,
          thumbnailUrl: true,
          videoUrl: true,
        },
      });
    }

    res.json({
      ...exercise,
      alternativeExercises: resolvedAlternatives,
    });
  } catch (err) {
    console.error('Error fetching exercise details:', err);
    res.status(500).json({ error: 'Failed to fetch exercise details' });
  }
};

/**
 * Add exercise to today's workout or specific workout.
 */
const addExerciseToWorkout = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      workoutId,
      workoutDate,
      sets,
      reps,
      weightKg,
      durationSec,
      distanceKm,
    } = req.body;

    const exercise = await prisma.exercise.findUnique({ where: { id } });
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    let targetWorkout = null;

    if (workoutId) {
      targetWorkout = await prisma.workout.findFirst({
        where: { id: workoutId, userId: req.user.id },
        include: { exercises: true },
      });
      if (!targetWorkout) {
        return res.status(404).json({ error: 'Selected workout not found' });
      }
    } else {
      // Find today's workout or create one
      const dateOnly = workoutDate ? new Date(workoutDate) : new Date();
      targetWorkout = await prisma.workout.findFirst({
        where: {
          userId: req.user.id,
          workoutDate: dateOnly,
        },
        include: { exercises: true },
      });

      if (!targetWorkout) {
        targetWorkout = await prisma.workout.create({
          data: {
            userId: req.user.id,
            name: `${exercise.primaryMuscle || 'Workout'} Session`,
            workoutDate: dateOnly,
            status: 'planned',
          },
          include: { exercises: true },
        });
      }
    }

    const orderIndex = targetWorkout.exercises ? targetWorkout.exercises.length : 0;

    const addedExercise = await prisma.workoutExercise.create({
      data: {
        workoutId: targetWorkout.id,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: sets !== undefined ? Number(sets) : exercise.recommendedSets || 3,
        reps: reps !== undefined ? String(reps) : exercise.recommendedReps || '10',
        weightKg: weightKg !== undefined && weightKg !== '' ? Number(weightKg) : null,
        durationSec: durationSec ? Number(durationSec) : null,
        distanceKm: distanceKm ? Number(distanceKm) : null,
        orderIndex,
      },
    });

    res.status(201).json({
      message: `Added ${exercise.name} to workout`,
      workoutId: targetWorkout.id,
      exercise: addedExercise,
    });
  } catch (err) {
    console.error('Error adding exercise to workout:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Admin: Create an exercise in the catalog.
 */
const createExercise = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.name || !data.primaryMuscle) {
      return res.status(400).json({ error: 'Exercise name and primary muscle are required' });
    }

    const created = await prisma.exercise.create({
      data: {
        name: data.name.trim(),
        equipmentId: data.equipmentId || null,
        category: data.category || 'Strength',
        difficultyLevel: data.difficultyLevel || 'Beginner',
        primaryMuscle: data.primaryMuscle,
        secondaryMuscles: data.secondaryMuscles || [],
        shortDescription: data.shortDescription || '',
        instructions: data.instructions || [],
        startingPosition: data.startingPosition || '',
        executionTechnique: data.executionTechnique || '',
        breathingInstructions: data.breathingInstructions || '',
        commonMistakes: data.commonMistakes || [],
        safetyTips: data.safetyTips || [],
        recommendedSets: data.recommendedSets ? Number(data.recommendedSets) : 3,
        recommendedReps: data.recommendedReps ? String(data.recommendedReps) : '8-12',
        recommendedRestSec: data.recommendedRestSec ? Number(data.recommendedRestSec) : 90,
        videoUrl: data.videoUrl || null,
        thumbnailUrl: data.thumbnailUrl || null,
        gifUrl: data.gifUrl || null,
        images: data.images || [],
        tags: data.tags || [],
        alternatives: data.alternatives || [],
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating exercise:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Admin: Update exercise (replace video, instructions, etc.).
 */
const updateExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    const updated = await prisma.exercise.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (err) {
    console.error('Error updating exercise:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Admin: Delete exercise.
 */
const deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.exercise.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Exercise deactivated successfully' });
  } catch (err) {
    console.error('Error deleting exercise:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getExercises,
  getExerciseById,
  addExerciseToWorkout,
  createExercise,
  updateExercise,
  deleteExercise,
};
