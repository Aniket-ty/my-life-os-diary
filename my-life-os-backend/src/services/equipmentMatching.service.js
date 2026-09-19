const crypto = require('crypto');
const prisma = require('../config/database');

const CONFIDENCE_THRESHOLD = 0.65;

/**
 * Normalizes strings for robust matching.
 */
function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates token overlap score between 0 and 1.
 */
function tokenMatchScore(input, candidate) {
  const normInput = normalizeString(input);
  const normCand = normalizeString(candidate);

  if (!normInput || !normCand) return 0;
  if (normInput === normCand) return 1.0;
  if (normCand.includes(normInput) || normInput.includes(normCand)) return 0.9;

  const inputTokens = new Set(normInput.split(' '));
  const candTokens = new Set(normCand.split(' '));

  let intersection = 0;
  for (const token of inputTokens) {
    if (candTokens.has(token)) intersection++;
  }

  const union = new Set([...inputTokens, ...candTokens]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Finds the best matching Equipment entity in the database given a name or alias.
 */
async function matchEquipmentInDb(predictedName, alternatives = []) {
  const allEquipment = await prisma.equipment.findMany({
    where: { isActive: true },
    include: {
      exercises: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
      },
    },
  });

  const searchTerms = [predictedName, ...alternatives].filter(Boolean);

  let bestMatch = null;
  let highestScore = 0;

  for (const eq of allEquipment) {
    // Check main equipment name
    for (const term of searchTerms) {
      const nameScore = tokenMatchScore(term, eq.name);
      if (nameScore > highestScore) {
        highestScore = nameScore;
        bestMatch = eq;
      }

      // Check all aliases
      if (Array.isArray(eq.aliases)) {
        for (const alias of eq.aliases) {
          const aliasScore = tokenMatchScore(term, alias);
          if (aliasScore > highestScore) {
            highestScore = aliasScore;
            bestMatch = eq;
          }
        }
      }
    }
  }

  // Require at least 0.50 lexical similarity to consider a verified match
  if (highestScore >= 0.50) {
    return { equipment: bestMatch, matchScore: highestScore };
  }

  return { equipment: null, matchScore: 0 };
}

/**
 * Computes a SHA-256 hash of the image buffer for idempotent caching.
 */
function computeImageHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Main matcher that processes Vision AI output and returns verified equipment and exercises.
 */
async function processEquipmentIdentification({
  userId,
  imageBuffer,
  visionResult,
  providerName = 'groq',
}) {
  const {
    equipmentName,
    possibleAlternatives = [],
    confidence = 0.5,
    reasoning = '',
    isUncertain = false,
    detectedMultiple = false,
    multipleEquipment = [],
  } = visionResult;

  const imageHash = imageBuffer ? computeImageHash(imageBuffer) : null;

  // 1. Check cache by image hash (within last 48 hours)
  if (imageHash) {
    const cachedLog = await prisma.equipmentScanLog.findFirst({
      where: {
        imageHash,
        status: 'success',
        createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        equipment: {
          include: {
            exercises: { where: { isActive: true } },
          },
        },
      },
    });

    if (cachedLog && cachedLog.equipment && cachedLog.cachedResult) {
      return {
        ...cachedLog.cachedResult,
        isCached: true,
      };
    }
  }

  // 2. Handle multiple equipment detection
  if (detectedMultiple && multipleEquipment && multipleEquipment.length > 1) {
    const matchedCandidates = [];
    for (const name of multipleEquipment) {
      const { equipment } = await matchEquipmentInDb(name);
      if (equipment && !matchedCandidates.some((c) => c.id === equipment.id)) {
        matchedCandidates.push({
          id: equipment.id,
          name: equipment.name,
          category: equipment.category,
          imageUrl: equipment.imageUrl,
          primaryMuscles: equipment.primaryMuscles,
          exerciseCount: equipment.exercises.length,
        });
      }
    }

    if (matchedCandidates.length > 1) {
      const response = {
        detectedMultiple: true,
        message: 'I found multiple pieces of equipment in this photo.',
        candidates: matchedCandidates,
      };

      if (userId) {
        await prisma.equipmentScanLog.create({
          data: {
            userId,
            detectedName: equipmentName,
            confidence,
            provider: providerName,
            status: 'multiple_detected',
            imageHash,
            cachedResult: response,
          },
        });
      }

      return response;
    }
  }

  // 3. Match against verified database
  const { equipment: matchedEq, matchScore } = await matchEquipmentInDb(equipmentName, possibleAlternatives);

  // 4. Handle low confidence or no match
  const finalConfidence = Math.round((confidence * (matchScore ? 0.5 + 0.5 * matchScore : 0.7)) * 100) / 100;
  const shouldMarkUncertain = isUncertain || finalConfidence < CONFIDENCE_THRESHOLD || !matchedEq;

  if (shouldMarkUncertain) {
    // Provide popular fallback suggestions
    const suggestions = await prisma.equipment.findMany({
      where: { isActive: true },
      take: 4,
      select: { id: true, name: true, category: true, imageUrl: true },
    });

    const response = {
      isUncertain: true,
      confidence: finalConfidence,
      detectedName: equipmentName,
      message: "I'm not completely sure what machine this is.",
      reasoning: reasoning || 'The machine could not be identified with high confidence.',
      tips: [
        'Take a photo from the front showing the whole machine',
        'Ensure good lighting and avoid motion blur',
        'Step back so the seat, handles, and weight stack are all in frame',
        'Use the manual search bar to search by machine name',
      ],
      suggestions,
    };

    if (userId) {
      await prisma.equipmentScanLog.create({
        data: {
          userId,
          detectedName: equipmentName,
          confidence: finalConfidence,
          provider: providerName,
          status: 'low_confidence',
          imageHash,
          cachedResult: response,
        },
      });
    }

    return response;
  }

  // 5. Successful identification conforming strictly to prompt schema
  const formattedResponse = {
    equipment: {
      id: matchedEq.id,
      name: matchedEq.name,
      category: matchedEq.category,
      confidence: finalConfidence,
      imageUrl: matchedEq.imageUrl,
    },
    description: matchedEq.description,
    primaryMuscles: matchedEq.primaryMuscles,
    secondaryMuscles: matchedEq.secondaryMuscles,
    howToUse: matchedEq.instructions,
    setupInstructions: matchedEq.setupInstructions,
    safetyTips: matchedEq.safetyInstructions,
    commonMistakes: matchedEq.commonMistakes,
    exercises: matchedEq.exercises.map((ex) => ({
      id: ex.id,
      name: ex.name,
      primaryMuscle: ex.primaryMuscle,
      difficultyLevel: ex.difficultyLevel,
      shortDescription: ex.shortDescription,
      recommendedSets: ex.recommendedSets,
      recommendedReps: ex.recommendedReps,
      videoUrl: ex.videoUrl,
      thumbnailUrl: ex.thumbnailUrl,
    })),
    reasoning,
  };

  // 6. Save scan log for analytics and caching
  if (userId) {
    await prisma.equipmentScanLog.create({
      data: {
        userId,
        equipmentId: matchedEq.id,
        detectedName: equipmentName,
        confidence: finalConfidence,
        provider: providerName,
        status: 'success',
        imageHash,
        cachedResult: formattedResponse,
      },
    });
  }

  return formattedResponse;
}

module.exports = {
  processEquipmentIdentification,
  matchEquipmentInDb,
  normalizeString,
  tokenMatchScore,
  CONFIDENCE_THRESHOLD,
};
