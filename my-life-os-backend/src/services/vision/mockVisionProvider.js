const VisionProvider = require('./visionProvider');

class MockVisionProvider extends VisionProvider {
  constructor(options = {}) {
    super();
    this.defaultMachine = options.defaultMachine || 'Lat Pulldown Machine';
    this.defaultConfidence = options.defaultConfidence !== undefined ? options.defaultConfidence : 0.94;
  }

  async identifyEquipment(imageBuffer, mimeType = 'image/jpeg') {
    // If mock image or test mode asks for low confidence:
    const size = imageBuffer ? imageBuffer.length : 0;

    // Deterministic simulation based on buffer characteristics
    if (size % 9 === 0 && size > 0) {
      return {
        equipmentName: 'Unknown Gym Equipment',
        possibleAlternatives: ['Cable Machine', 'Smith Machine'],
        confidence: 0.35,
        reasoning: 'Image is too blurry, dark, or obscured to make a definitive identification.',
        isUncertain: true,
        detectedMultiple: false,
        multipleEquipment: [],
      };
    }

    if (size % 7 === 0 && size > 0) {
      return {
        equipmentName: 'Cable Crossover',
        possibleAlternatives: ['Lat Pulldown Machine', 'Seated Cable Row', 'Chest Press Machine'],
        confidence: 0.88,
        reasoning: 'Detected a wide dual cable station with overhead pulleys and selectorized pin stacks on both sides.',
        isUncertain: false,
        detectedMultiple: true,
        multipleEquipment: ['Cable Crossover', 'Lat Pulldown Machine', 'Adjustable Bench'],
      };
    }

    return {
      equipmentName: this.defaultMachine,
      possibleAlternatives: ['Cable Pulldown', 'Wide Grip Pulldown', 'Seated High Row'],
      confidence: this.defaultConfidence,
      reasoning: 'Clearly identified overhead high cable pulley, horizontal thigh restraint pads, and wide lat bar.',
      isUncertain: false,
      detectedMultiple: false,
      multipleEquipment: [],
    };
  }
}

module.exports = MockVisionProvider;
