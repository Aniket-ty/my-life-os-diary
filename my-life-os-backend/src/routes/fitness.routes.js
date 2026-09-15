const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getWorkouts, getWorkout, createWorkout, updateWorkout,
  deleteWorkout, addExercises, deleteExercise,
  getNutrition, logFood, analyzeFood, deleteFood, getDailySummary,
  getGoals, upsertGoals, getConsistencyReport,
} = require('../controllers/fitness.controller');

router.use(authenticate);

// Workouts
router.get('/workouts', getWorkouts);
router.get('/workouts/:id', getWorkout);
router.post('/workouts', createWorkout);
router.put('/workouts/:id', updateWorkout);
router.delete('/workouts/:id', deleteWorkout);
router.post('/workouts/:id/exercises', addExercises);
router.delete('/workouts/:id/exercises/:exerciseId', deleteExercise);

// Nutrition
router.get('/nutrition', getNutrition);
router.post('/nutrition/analyze', upload.single('file'), analyzeFood);
router.post('/nutrition', logFood);
router.delete('/nutrition/:id', deleteFood);
router.get('/summary', getDailySummary);

// Goals
router.get('/goals', getGoals);
router.put('/goals', upsertGoals);

// Report
router.get('/report', getConsistencyReport);

module.exports = router;
