const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  getPlans, getActivePlan, createPlan, updatePlan, deletePlan,
  updatePlanDay, applyPlanDay,
} = require('../controllers/workoutPlan.controller');
const { generatePlan } = require('../controllers/workoutPlanAI.controller');

const router = express.Router();

router.use(authenticate);

router.post('/generate', generatePlan);
router.get('/', getPlans);
router.get('/active', getActivePlan);
router.post('/', createPlan);
router.put('/:id', updatePlan);
router.delete('/:id', deletePlan);
router.put('/:id/days/:dayId', updatePlanDay);
router.post('/:id/apply/:dayId', applyPlanDay);

module.exports = router;
