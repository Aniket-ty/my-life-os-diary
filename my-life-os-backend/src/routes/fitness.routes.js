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

const {
  scanEquipment,
  getEquipmentList,
  getEquipmentById,
  getEquipmentExercises,
  createEquipment,
  updateEquipment,
  deleteEquipment,
} = require('../controllers/equipment.controller');
const {
  getExercises,
  getExerciseById,
  addExerciseToWorkout,
  createExercise,
  updateExercise,
  deleteExercise: deleteCatalogExercise,
} = require('../controllers/exercise.controller');
const { trackAnalyticsEvent } = require('../controllers/fitnessAnalytics.controller');

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

// ── Gym Equipment & Scanner ─────────────────────────────
router.post('/equipment/scan', upload.single('file'), scanEquipment);
router.get('/equipment', getEquipmentList);
router.get('/equipment/:id', getEquipmentById);
router.get('/equipment/:id/exercises', getEquipmentExercises);
router.post('/admin/equipment', createEquipment);
router.put('/admin/equipment/:id', updateEquipment);
router.delete('/admin/equipment/:id', deleteEquipment);

// ── Exercise Demonstrations & Catalog ────────────────────
router.get('/exercises', getExercises);
router.get('/exercises/:id', getExerciseById);
router.post('/exercises/:id/add-to-workout', addExerciseToWorkout);
router.post('/admin/exercises', createExercise);
router.put('/admin/exercises/:id', updateExercise);
router.delete('/admin/exercises/:id', deleteCatalogExercise);

// ── Analytics ───────────────────────────────────────────
router.post('/analytics/event', trackAnalyticsEvent);

module.exports = router;

