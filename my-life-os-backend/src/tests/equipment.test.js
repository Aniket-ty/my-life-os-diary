const assert = require('assert');
const { getVisionProvider, MockVisionProvider } = require('../services/vision');
const {
  matchEquipmentInDb,
  processEquipmentIdentification,
  tokenMatchScore,
  normalizeString,
} = require('../services/equipmentMatching.service');
const prisma = require('../config/database');

async function runTests() {
  console.log('🧪 Starting Equipment Scanner & Exercise System Tests...\n');

  try {
    // 1. Test string normalization and token overlap
    console.log('▶ Test 1: String normalization & token matching');
    const norm = normalizeString('Lat Pulldown Machine! (Cable)');
    assert.strictEqual(norm, 'lat pulldown machine cable', 'String normalization failed');

    const scoreExact = tokenMatchScore('Lat Pulldown', 'Lat Pulldown Machine');
    assert(scoreExact >= 0.8, 'Expected high similarity score for substring/token match');
    console.log('  ✓ Normalization & token overlap passed');

    // 2. Test MockVisionProvider
    console.log('▶ Test 2: MockVisionProvider contract');
    const mockProvider = new MockVisionProvider({ defaultMachine: 'Lat Pulldown Machine', defaultConfidence: 0.94 });
    const mockResult = await mockProvider.identifyEquipment(Buffer.from('sample-image-data'));
    assert.strictEqual(mockResult.equipmentName, 'Lat Pulldown Machine');
    assert.strictEqual(mockResult.confidence, 0.94);
    assert.strictEqual(mockResult.isUncertain, false);
    console.log('  ✓ MockVisionProvider returns expected schema');

    // 3. Test Database matching by alias
    console.log('▶ Test 3: Equipment database alias matching');
    const { equipment: matchedByAlias } = await matchEquipmentInDb('Pulldown Machine');
    assert(matchedByAlias !== null, 'Should find Lat Pulldown Machine by alias "Pulldown Machine"');
    assert.strictEqual(matchedByAlias.name, 'Lat Pulldown Machine');
    console.log(`  ✓ Alias "Pulldown Machine" successfully matched to "${matchedByAlias.name}"`);

    // 4. Test low confidence / uncertainty handling
    console.log('▶ Test 4: Low confidence handling');
    const lowConfResult = await processEquipmentIdentification({
      userId: null,
      imageBuffer: null,
      visionResult: {
        equipmentName: 'Unknown Object',
        confidence: 0.3,
        reasoning: 'Too blurry to tell',
        isUncertain: true,
      },
      providerName: 'mock',
    });

    assert.strictEqual(lowConfResult.isUncertain, true, 'Result should be marked uncertain');
    assert(lowConfResult.tips && lowConfResult.tips.length > 0, 'Should provide helpful retry tips');
    assert(lowConfResult.suggestions && lowConfResult.suggestions.length > 0, 'Should provide fallback suggestions');
    console.log('  ✓ Low confidence properly returned helpful tips and manual fallback suggestions');

    // 5. Test high confidence processing with full exercise relations
    console.log('▶ Test 5: High confidence processing with exercises');
    const highConfResult = await processEquipmentIdentification({
      userId: null,
      imageBuffer: Buffer.from('gym-machine-test-1234'),
      visionResult: {
        equipmentName: 'Lat Pulldown Machine',
        possibleAlternatives: ['Lat Pulldown'],
        confidence: 0.92,
        reasoning: 'Overhead bar and seat cushion detected.',
      },
      providerName: 'mock',
    });

    assert.strictEqual(highConfResult.equipment.name, 'Lat Pulldown Machine');
    assert(highConfResult.exercises && highConfResult.exercises.length > 0, 'Should return linked exercises');
    assert(highConfResult.primaryMuscles.length > 0, 'Should return primary muscles');
    assert(highConfResult.howToUse.length > 0, 'Should return how to use instructions');
    console.log(`  ✓ Successfully returned ${highConfResult.equipment.name} with ${highConfResult.exercises.length} verified exercise demonstrations`);

    // 6. Test Multi-equipment candidate detection
    console.log('▶ Test 6: Multi-equipment candidate detection');
    const multiResult = await processEquipmentIdentification({
      userId: null,
      imageBuffer: null,
      visionResult: {
        equipmentName: 'Cable Crossover',
        confidence: 0.88,
        detectedMultiple: true,
        multipleEquipment: ['Cable Crossover', 'Lat Pulldown Machine', 'Adjustable Bench'],
      },
      providerName: 'mock',
    });

    assert.strictEqual(multiResult.detectedMultiple, true);
    assert(multiResult.candidates.length >= 2, 'Should have multiple candidates');
    console.log(`  ✓ Successfully returned ${multiResult.candidates.length} candidates for user selection`);

    console.log('\n🎉 ALL BACKEND EQUIPMENT TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
