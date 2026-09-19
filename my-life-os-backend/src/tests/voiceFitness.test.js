const assert = require('assert');
const prisma = require('../config/database');
const voiceService = require('../services/voice.service');

async function testVoiceIntegration() {
  console.log('🎤 Testing Voice Fitness Commands Integration...\n');

  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      throw new Error('No user in database to test voice commands');
    }

    // 1. "What machine is this?"
    console.log('▶ Voice Test 1: "What machine is this?"');
    const res1 = await voiceService.processVoiceCommand(user.id, 'What machine is this?');
    assert.strictEqual(res1.intent, 'SCAN_GYM_EQUIPMENT');
    assert.strictEqual(res1.kind, 'navigate');
    assert.strictEqual(res1.route, 'fitness');
    console.log('  ✓ Returned navigate to fitness scanner:', res1.resultText);

    // 2. "How do I use this machine?"
    console.log('▶ Voice Test 2: "How do I use this machine?"');
    const res2 = await voiceService.processVoiceCommand(user.id, 'How do I use this machine?');
    assert.strictEqual(res2.intent, 'GET_EQUIPMENT_GUIDE');
    assert.strictEqual(res2.kind, 'result');
    assert(res2.resultText && res2.resultText.includes('how to adjust and use'));
    console.log('  ✓ Returned guide:', res2.resultText);

    // 3. "Show me an exercise for chest using this machine"
    console.log('▶ Voice Test 3: "Show me an exercise for chest using this machine"');
    const res3 = await voiceService.processVoiceCommand(user.id, 'Show me an exercise for chest using this machine');
    assert.strictEqual(res3.intent, 'GET_MACHINE_EXERCISE');
    assert.strictEqual(res3.kind, 'result');
    assert(res3.data && res3.data.exercise);
    console.log('  ✓ Returned exercise suggestion:', res3.resultText);

    // 4. "Add this exercise to today's workout"
    console.log('▶ Voice Test 4: "Add this exercise to today\'s workout"');
    const res4 = await voiceService.processVoiceCommand(user.id, "Add this exercise to today's workout");
    assert.strictEqual(res4.intent, 'ADD_EXERCISE_TO_WORKOUT');
    assert.strictEqual(res4.kind, 'result');
    assert(res4.data && res4.data.workoutExercise);
    console.log('  ✓ Added exercise to today\'s workout:', res4.resultText);

    // 5. "Give me the next exercise"
    console.log('▶ Voice Test 5: "Give me the next exercise"');
    const res5 = await voiceService.processVoiceCommand(user.id, 'Give me the next exercise');
    assert.strictEqual(res5.intent, 'GET_NEXT_EXERCISE');
    assert.strictEqual(res5.kind, 'result');
    assert(res5.resultText.includes('next exercise'));
    console.log('  ✓ Retrieved next exercise:', res5.resultText);

    console.log('\n🎉 ALL 5 FITNESS VOICE COMMANDS VERIFIED AND PASSING!\n');
  } catch (err) {
    console.error('❌ Voice test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testVoiceIntegration();
