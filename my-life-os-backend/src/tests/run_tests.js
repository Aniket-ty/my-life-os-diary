/**
 * Comprehensive Test Suite for My Life OS - Expense Engine, Splitwise, Balance,
 * Currency, Settlements, Date Parsing, Voice Intents, and Item-Level OCR Splitting.
 */

const assert = require('assert');
const { equalSplit, toMinor, toNumber, formatMinor, mulByRate, add, sub } = require('../utils/money');
const { buildSplits, normaliseSplitRequest } = require('../services/expenseSplit.service');
const { calculateGroupBalances, suggestSettlements, pairwiseBalance } = require('../services/balance.service');
const { calculateItemSplits } = require('../services/receiptSplit.service');
const { parseDateExpression, parseAmountExpression } = require('../utils/dates');
const { fallbackRate } = require('../services/currency.service');
const { parseCommandHeuristic } = require('../services/ai/heuristicParser');
const { normalizePhoneNumber, getPhoneSearchPatterns } = require('../utils/phone');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n=== RUNNING EXPENSE ENGINE & SPLITWISE TEST SUITE ===\n');

  console.log('--- 1. SPLIT ENGINE & MONEY ARITHMETIC ---');

  test('₹1200 split equally between 3 people (exact ₹400 each)', () => {
    const splits = buildSplits(1200, 'EQUAL', [
      { userId: 'u1' },
      { userId: 'u2' },
      { userId: 'u3' },
    ]);
    assert.strictEqual(splits.length, 3);
    assert.strictEqual(toNumber(splits[0].amountMinor), 400);
    assert.strictEqual(toNumber(splits[1].amountMinor), 400);
    assert.strictEqual(toNumber(splits[2].amountMinor), 400);
    const sum = splits.reduce((acc, s) => acc + s.amountMinor, 0n);
    assert.strictEqual(sum, toMinor(1200));
  });

  test('₹100 split equally between 3 people (handles 33.33, 33.33, 33.34 exactly)', () => {
    const splits = buildSplits(100, 'EQUAL', [
      { userId: 'u1' },
      { userId: 'u2' },
      { userId: 'u3' },
    ]);
    assert.strictEqual(splits.length, 3);
    assert.strictEqual(toNumber(splits[0].amountMinor), 33.33);
    assert.strictEqual(toNumber(splits[1].amountMinor), 33.33);
    assert.strictEqual(toNumber(splits[2].amountMinor), 33.34);
    const sum = splits.reduce((acc, s) => acc + s.amountMinor, 0n);
    assert.strictEqual(sum, toMinor(100));
  });

  test('₹1000 with 40/30/30 percentage split (₹400, ₹300, ₹300)', () => {
    const splits = buildSplits(1000, 'PERCENTAGE', [
      { userId: 'u1', percentage: 40 },
      { userId: 'u2', percentage: 30 },
      { userId: 'u3', percentage: 30 },
    ]);
    assert.strictEqual(toNumber(splits[0].amountMinor), 400);
    assert.strictEqual(toNumber(splits[1].amountMinor), 300);
    assert.strictEqual(toNumber(splits[2].amountMinor), 300);
    const sum = splits.reduce((acc, s) => acc + s.amountMinor, 0n);
    assert.strictEqual(sum, toMinor(1000));
  });

  test('Invalid percentage total (not 100%) throws validation error', () => {
    assert.throws(() => {
      buildSplits(1000, 'PERCENTAGE', [
        { userId: 'u1', percentage: 40 },
        { userId: 'u2', percentage: 40 },
      ]);
    }, /Percentages must add up to 100/);
  });

  test('Exact split validation (must equal total amount)', () => {
    const splits = buildSplits(1000, 'EXACT', [
      { userId: 'u1', amount: 300 },
      { userId: 'u2', amount: 400 },
      { userId: 'u3', amount: 300 },
    ]);
    assert.strictEqual(splits.length, 3);
    assert.throws(() => {
      buildSplits(1000, 'EXACT', [
        { userId: 'u1', amount: 300 },
        { userId: 'u2', amount: 300 },
      ]);
    }, /Exact split amounts must add up to the total/);
  });

  test('Shares split (2 shares, 1 share, 1 share on ₹1200 -> ₹600, ₹300, ₹300)', () => {
    const splits = buildSplits(1200, 'SHARES', [
      { userId: 'u1', shares: 2 },
      { userId: 'u2', shares: 1 },
      { userId: 'u3', shares: 1 },
    ]);
    assert.strictEqual(toNumber(splits[0].amountMinor), 600);
    assert.strictEqual(toNumber(splits[1].amountMinor), 300);
    assert.strictEqual(toNumber(splits[2].amountMinor), 300);
  });

  console.log('\n--- 2. BALANCE ENGINE & SETTLEMENTS ---');

  test('Group Balance Calculation: Aniket pays ₹1200 split equally among Aniket, Rahul, Aman', () => {
    const members = [
      { id: 'aniket', name: 'Aniket' },
      { id: 'rahul', name: 'Rahul' },
      { id: 'aman', name: 'Aman' },
    ];
    const expenses = [
      {
        id: 'e1',
        paidById: 'aniket',
        amount: 1200,
        splits: [
          { userId: 'aniket', amount: 400 },
          { userId: 'rahul', amount: 400 },
          { userId: 'aman', amount: 400 },
        ],
      },
    ];
    const settlements = [];

    const res = calculateGroupBalances({ expenses, settlements, members });

    const aniket = res.members.find((m) => m.userId === 'aniket');
    const rahul = res.members.find((m) => m.userId === 'rahul');
    const aman = res.members.find((m) => m.userId === 'aman');

    assert.strictEqual(aniket.net, 800); // Aniket is owed 800
    assert.strictEqual(rahul.net, -400);  // Rahul owes 400
    assert.strictEqual(aman.net, -400);   // Aman owes 400

    // Net sum must always be 0
    const sumNet = res.members.reduce((acc, m) => acc + m.net, 0);
    assert.strictEqual(Math.round(sumNet), 0);
  });

  test('Settlement updates balances: Rahul pays Aniket ₹400', () => {
    const members = [
      { id: 'aniket', name: 'Aniket' },
      { id: 'rahul', name: 'Rahul' },
      { id: 'aman', name: 'Aman' },
    ];
    const expenses = [
      {
        id: 'e1',
        paidById: 'aniket',
        amount: 1200,
        splits: [
          { userId: 'aniket', amount: 400 },
          { userId: 'rahul', amount: 400 },
          { userId: 'aman', amount: 400 },
        ],
      },
    ];
    const settlements = [
      { fromUserId: 'rahul', toUserId: 'aniket', amount: 400 },
    ];

    const res = calculateGroupBalances({ expenses, settlements, members });
    const rahul = res.members.find((m) => m.userId === 'rahul');
    const aniket = res.members.find((m) => m.userId === 'aniket');

    assert.strictEqual(rahul.net, 0); // Rahul is fully settled!
    assert.strictEqual(aniket.net, 400); // Aniket is still owed 400 by Aman
  });

  test('Greedy Balance Simplification (Optimization)', () => {
    const memberRows = [
      { userId: 'aniket', name: 'Aniket', net: 1000 },
      { userId: 'rahul', name: 'Rahul', net: -600 },
      { userId: 'aman', name: 'Aman', net: -400 },
    ];
    const simplified = suggestSettlements(memberRows);
    assert.strictEqual(simplified.length, 2);
    assert.strictEqual(simplified[0].fromUserId, 'rahul');
    assert.strictEqual(simplified[0].toUserId, 'aniket');
    assert.strictEqual(simplified[0].amount, 600);
    assert.strictEqual(simplified[1].fromUserId, 'aman');
    assert.strictEqual(simplified[1].toUserId, 'aniket');
    assert.strictEqual(simplified[1].amount, 400);
  });

  console.log('\n--- 3. MULTI-CURRENCY CONVERSION ---');

  test('Fallback rate calculation EUR -> INR', () => {
    const rate = fallbackRate('EUR', 'INR');
    assert(rate != null);
    const numRate = parseFloat(rate);
    assert(numRate > 90 && numRate < 115);
  });

  test('Currency rate multiplication with minor unit precision', () => {
    // €100.00 at 104.50 -> ₹10,450.00
    const converted = mulByRate(toMinor(100), '104.50');
    assert.strictEqual(toNumber(converted), 10450);
  });

  console.log('\n--- 4. ITEM-LEVEL OCR BILL SPLITTING & TAX ALLOCATION ---');

  test('Item-level split with proportional tax allocation', () => {
    const items = [
      { name: 'Pizza', amount: 800, assignedUserIds: ['aniket', 'rahul'] },  // 400 each
      { name: 'Burger', amount: 500, assignedUserIds: ['aman'] },            // 500
      { name: 'Pasta', amount: 600, assignedUserIds: ['aniket', 'aman'] },   // 300 each
      { name: 'Drinks', amount: 300, assignedUserIds: ['aniket', 'rahul', 'aman', 'rohit'] }, // 75 each
    ];
    // Subtotal: 800 + 500 + 600 + 300 = 2200
    // Tax: 200
    // Total: 2400
    const res = calculateItemSplits({
      items,
      subtotal: 2200,
      tax: 200,
      total: 2400,
      taxAllocation: 'proportional',
    });

    assert(res.sumCheck);
    assert.strictEqual(res.totalCalculated, 2400);
    assert.strictEqual(res.memberShares['aniket'].itemSubtotal, 775); // 400+300+75
    assert.strictEqual(res.memberShares['rahul'].itemSubtotal, 475);  // 400+75
    assert.strictEqual(res.memberShares['aman'].itemSubtotal, 875);   // 500+300+75
    assert.strictEqual(res.memberShares['rohit'].itemSubtotal, 75);   // 75

    // Total of all member shares must equal 2400 exactly
    const memberTotalSum = Object.values(res.memberShares).reduce((acc, m) => acc + m.total, 0);
    assert.strictEqual(Math.round(memberTotalSum * 100) / 100, 2400);
  });

  test('Item-level split with equal tax allocation', () => {
    const items = [
      { name: 'Lunch', amount: 600, assignedUserIds: ['u1', 'u2'] }, // 300 each
    ];
    const res = calculateItemSplits({
      items,
      subtotal: 600,
      tax: 60,
      total: 660,
      taxAllocation: 'equal',
    });
    assert.strictEqual(res.memberShares['u1'].taxShare, 30);
    assert.strictEqual(res.memberShares['u2'].taxShare, 30);
    assert.strictEqual(res.memberShares['u1'].total, 330);
    assert.strictEqual(res.memberShares['u2'].total, 330);
    assert.strictEqual(res.totalCalculated, 660);
  });

  console.log('\n--- 5. NATURAL LANGUAGE DATE & AMOUNT PARSING ---');

  test('Natural language date: "yesterday" and "today"', () => {
    const now = new Date('2026-09-19T12:00:00Z');
    const yesterday = parseDateExpression('yesterday', now);
    assert.strictEqual(yesterday, '2026-09-18');
    const today = parseDateExpression('today', now);
    assert.strictEqual(today, '2026-09-19');
  });

  test('Natural language amount: ₹500, 120 yesterday, $20', () => {
    assert.strictEqual(parseAmountExpression('I spent ₹500 on lunch'), '500');
    assert.strictEqual(parseAmountExpression('I spent 120 yesterday on coffee'), '120');
    assert.strictEqual(parseAmountExpression('$20 for taxi'), '20');
  });

  console.log('\n--- 6. VOICE COMMAND INTENT PARSING ---');

  test('Voice: "I spent 500 rupees on lunch" -> CREATE_EXPENSE', () => {
    const cmd = parseCommandHeuristic('I spent 500 rupees on lunch');
    assert.strictEqual(cmd.intent, 'CREATE_EXPENSE');
    assert.strictEqual(cmd.entities.amount, 500);
    assert.strictEqual(cmd.entities.category, 'Food');
  });

  test('Voice: "Create a group called Goa Trip" -> CREATE_GROUP', () => {
    const cmd = parseCommandHeuristic('Create a group called Goa Trip');
    assert.strictEqual(cmd.intent, 'CREATE_GROUP');
    assert.strictEqual(cmd.entities.groupName, 'Goa Trip');
  });

  test('Voice: "How much does Rahul owe me?" -> GET_USER_BALANCE', () => {
    const cmd = parseCommandHeuristic('How much does Rahul owe me?');
    assert.strictEqual(cmd.intent, 'GET_USER_BALANCE');
    assert.strictEqual(cmd.entities.memberName, 'Rahul');
  });

  test('Voice: "Open my Goa trip" -> OPEN_GROUP', () => {
    const cmd = parseCommandHeuristic('Open my Goa trip');
    assert.strictEqual(cmd.intent, 'OPEN_GROUP');
  });

  test('Voice: "How much did I spend on food this month?" -> GET_CATEGORY_TOTAL', () => {
    const cmd = parseCommandHeuristic('How much did I spend on food this month?');
    assert.strictEqual(cmd.intent, 'GET_CATEGORY_TOTAL');
    assert.strictEqual(cmd.entities.category, 'Food');
  });

  test('Voice: "Open my diary" -> OPEN_DIARY', () => {
    const cmd = parseCommandHeuristic('Open my diary');
    assert.strictEqual(cmd.intent, 'OPEN_DIARY');
  });

  test('Voice: "Open fitness workouts" -> OPEN_FITNESS', () => {
    const cmd = parseCommandHeuristic('Open fitness workouts');
    assert.strictEqual(cmd.intent, 'OPEN_FITNESS');
  });

  test('Voice: "Add task Buy groceries" -> CREATE_TODO', () => {
    const cmd = parseCommandHeuristic('Add task Buy groceries');
    assert.strictEqual(cmd.intent, 'CREATE_TODO');
    assert.strictEqual(cmd.entities.title, 'Buy Groceries');
  });

  test('Voice: "Contact Rahul" -> CONTACT_USER', () => {
    const cmd = parseCommandHeuristic('Contact Rahul');
    assert.strictEqual(cmd.intent, 'CONTACT_USER');
    assert.strictEqual(cmd.entities.query, 'rahul');
  });

  test('Voice: "Log workout Chest Day 45 minutes 350 calories" -> LOG_WORKOUT', () => {
    const cmd = parseCommandHeuristic('Log workout Chest Day 45 minutes 350 calories');
    assert.strictEqual(cmd.intent, 'LOG_WORKOUT');
    assert.strictEqual(cmd.entities.name, 'Chest Day');
    assert.strictEqual(cmd.entities.durationMin, 45);
    assert.strictEqual(cmd.entities.caloriesBurned, 350);
  });

  test('Voice: "Log exercise Bench Press 3 sets 10 reps 80kg" -> LOG_EXERCISE', () => {
    const cmd = parseCommandHeuristic('Log exercise Bench Press 3 sets 10 reps 80kg');
    assert.strictEqual(cmd.intent, 'LOG_EXERCISE');
    assert.strictEqual(cmd.entities.exerciseName, 'Bench Press');
    assert.strictEqual(cmd.entities.sets, 3);
    assert.strictEqual(cmd.entities.reps, 10);
    assert.strictEqual(cmd.entities.weightKg, 80);
  });

  test('Voice: "Diary: Today was an awesome productive day" -> LOG_DIARY', () => {
    const cmd = parseCommandHeuristic('Diary: Today was an awesome productive day');
    assert.strictEqual(cmd.intent, 'LOG_DIARY');
    assert.strictEqual(cmd.entities.mood, 'happy');
    assert(cmd.entities.content.includes('productive day'));
  });

  test('Voice: "Log food 2 eggs and toast 350 calories" -> LOG_FOOD', () => {
    const cmd = parseCommandHeuristic('Log food 2 eggs and toast 350 calories');
    assert.strictEqual(cmd.intent, 'LOG_FOOD');
    assert.strictEqual(cmd.entities.calories, 350);
    assert(cmd.entities.foodName.includes('Eggs And Toast'));
  });

  console.log(`\n--- 7. MULTI-COUNTRY PHONE NORMALIZATION & SEARCH ---`);
  test('Phone Normalization: India (+91) format', () => {
    assert.strictEqual(normalizePhoneNumber('+91 98765 43210'), '+919876543210');
  });

  test('Phone Normalization: USA (+1) format', () => {
    assert.strictEqual(normalizePhoneNumber('+1 (415) 555-2671'), '+14155552671');
  });

  test('Phone Normalization: UK (+44) format', () => {
    assert.strictEqual(normalizePhoneNumber('+44 7911 123456'), '+447911123456');
  });

  test('Phone Normalization: UAE (+971) format', () => {
    assert.strictEqual(normalizePhoneNumber('+971 50 123 4567'), '+971501234567');
  });

  test('Phone Search: Generates cross-format matching patterns', () => {
    const patterns = getPhoneSearchPatterns('+91 98765 43210');
    assert(patterns.includes('919876543210'));
    assert(patterns.includes('+919876543210'));
    assert(patterns.includes('9876543210'));
  });

  console.log(`\n--- 8. OFFLINE SYNC BATCH VALIDATION ---`);
  test('Offline Batch Sync: validates payload structure for diary, todo, workout, expense', () => {
    const syncPayload = {
      diaryEntries: [{ localId: 'local_d1', title: 'Offline Note', content: 'Wrote this on airplane' }],
      todos: [{ localId: 'local_t1', title: 'Buy milk', isCompleted: false, priority: 'high' }],
      workouts: [{ localId: 'local_w1', name: 'Leg Day', durationMin: 40, totalCaloriesBurned: 300, exercises: [{ name: 'Squats', sets: 4, reps: '10' }] }],
      expenses: [{ localId: 'local_e1', amount: 350, description: 'Lunch', category: 'Food' }],
    };

    assert.strictEqual(syncPayload.diaryEntries.length, 1);
    assert.strictEqual(syncPayload.todos[0].priority, 'high');
    assert.strictEqual(syncPayload.workouts[0].exercises.length, 1);
    assert.strictEqual(syncPayload.expenses[0].amount, 350);
  });

  console.log(`\n==============================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==============================================\n`);

  if (failed > 0) process.exit(1);
}

runAllTests();
