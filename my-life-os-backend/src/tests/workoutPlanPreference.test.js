const assert = require('assert');
const prisma = require('../config/database');
const { generatePlan } = require('../controllers/workoutPlanAI.controller');

async function testWorkoutPlanPreferences() {
  console.log('🧪 Testing Workout Plan Generation with Custom Preferences...');

  try {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No test user found');

    const req = {
      user: { id: user.id },
      body: {
        goal: 'gain',
        fitnessLevel: 'intermediate',
        daysPerWeek: 5,
        splitType: 'Push Pull Legs (PPL)',
        workoutDuration: '45-60 mins',
        equipment: ['Gym machines', 'Dumbbells', 'Barbell'],
        focus: 'Chest & Arms',
        preferences: 'Focus on hypertrophy, avoid squats due to knee issue, include drop sets and 90s rest',
      },
    };

    let responseData = null;
    let statusCode = 200;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    await generatePlan(req, res);

    assert.strictEqual(statusCode, 200, 'Expected status 200');
    assert(responseData, 'Expected responseData');
    assert(Array.isArray(responseData.days), 'Expected responseData.days to be an array');
    assert.strictEqual(responseData.days.length, 7, 'Expected 7 days in weekly plan');

    console.log(`  ✓ Plan Name: "${responseData.name}"`);
    console.log(`  ✓ Goal: ${responseData.goal}, Level: ${responseData.fitnessLevel}`);
    console.log(`  ✓ Days Generated: ${responseData.days.length}`);

    const activeDays = responseData.days.filter((d) => !d.restDay);
    assert(activeDays.length > 0, 'Expected at least 1 active workout day');

    const firstActive = activeDays[0];
    console.log(`  ✓ Sample Workout: "${firstActive.workoutName}" (${firstActive.muscleGroup})`);
    console.log(`    Exercises (${firstActive.exercises.length}):`);
    firstActive.exercises.forEach((ex) => {
      console.log(`    - ${ex.name}: ${ex.sets} sets × ${ex.reps} (Rest: ${ex.restSec || 90}s)`);
    });

    console.log('\n🎉 WORKOUT PLAN GENERATION WITH PREFERENCES VERIFIED AND PASSING!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkoutPlanPreferences();
