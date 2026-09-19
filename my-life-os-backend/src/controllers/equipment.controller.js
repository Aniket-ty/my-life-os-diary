const prisma = require('../config/database');
const { getVisionProvider } = require('../services/vision');
const { processEquipmentIdentification } = require('../services/equipmentMatching.service');

/**
 * Scan gym machine via photo upload or camera capture.
 */
const scanEquipment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please provide an image file of the gym equipment' });
    }

    const { buffer, mimetype, size } = req.file;

    // Reject non-images or files larger than 15MB
    if (!mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Unsupported file type. Please upload a valid image (JPEG, PNG, WEBP).' });
    }

    if (size > 15 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image size exceeds maximum limit of 15MB.' });
    }

    const providerName = req.query.provider || process.env.AI_VISION_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'groq');
    const visionProvider = getVisionProvider(providerName);

    // Call Vision AI
    const visionResult = await visionProvider.identifyEquipment(buffer, mimetype);

    // Map AI output against verified database
    const response = await processEquipmentIdentification({
      userId: req.user?.id,
      imageBuffer: buffer,
      visionResult,
      providerName,
    });

    res.json(response);
  } catch (err) {
    console.error('Error scanning equipment:', err);
    res.status(500).json({
      error: 'Failed to process equipment image. Please try again or search manually.',
      details: err.message,
    });
  }
};

/**
 * List / search gym equipment.
 */
const getEquipmentList = async (req, res) => {
  try {
    const { q, category, muscle } = req.query;

    const where = { isActive: true };

    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    if (muscle) {
      where.primaryMuscles = { has: muscle };
    }

    let equipmentList = await prisma.equipment.findMany({
      where,
      include: {
        exercises: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            primaryMuscle: true,
            difficultyLevel: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // In-memory alias & keyword search if search query provided
    if (q && q.trim()) {
      const searchTerm = q.trim().toLowerCase();
      equipmentList = equipmentList.filter((eq) => {
        const matchName = eq.name.toLowerCase().includes(searchTerm);
        const matchCategory = eq.category.toLowerCase().includes(searchTerm);
        const matchAliases = Array.isArray(eq.aliases) && eq.aliases.some((a) => a.toLowerCase().includes(searchTerm));
        const matchMuscles = Array.isArray(eq.primaryMuscles) && eq.primaryMuscles.some((m) => m.toLowerCase().includes(searchTerm));
        return matchName || matchCategory || matchAliases || matchMuscles;
      });
    }

    res.json(equipmentList);
  } catch (err) {
    console.error('Error fetching equipment list:', err);
    res.status(500).json({ error: 'Failed to fetch equipment list' });
  }
};

/**
 * Get detailed equipment by ID with all exercises.
 */
const getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        exercises: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json(equipment);
  } catch (err) {
    console.error('Error fetching equipment by id:', err);
    res.status(500).json({ error: 'Failed to fetch equipment details' });
  }
};

/**
 * Get exercises for a specific equipment machine.
 */
const getEquipmentExercises = async (req, res) => {
  try {
    const { id } = req.params;

    const exercises = await prisma.exercise.findMany({
      where: { equipmentId: id, isActive: true },
      orderBy: { name: 'asc' },
    });

    res.json(exercises);
  } catch (err) {
    console.error('Error fetching equipment exercises:', err);
    res.status(500).json({ error: 'Failed to fetch equipment exercises' });
  }
};

/**
 * Admin: Create new equipment.
 */
const createEquipment = async (req, res) => {
  try {
    const {
      name,
      aliases = [],
      category,
      description,
      primaryMuscles = [],
      secondaryMuscles = [],
      instructions = [],
      setupInstructions = [],
      safetyInstructions = [],
      commonMistakes = [],
      imageUrl,
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Equipment name and category are required' });
    }

    const created = await prisma.equipment.create({
      data: {
        name: name.trim(),
        aliases: Array.isArray(aliases) ? aliases : [aliases],
        category,
        description: description || '',
        primaryMuscles,
        secondaryMuscles,
        instructions,
        setupInstructions,
        safetyInstructions,
        commonMistakes,
        imageUrl,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating equipment:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Admin: Update equipment.
 */
const updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    const updated = await prisma.equipment.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (err) {
    console.error('Error updating equipment:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Admin: Delete equipment (or soft delete).
 */
const deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.equipment.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Equipment deactivated successfully' });
  } catch (err) {
    console.error('Error deleting equipment:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  scanEquipment,
  getEquipmentList,
  getEquipmentById,
  getEquipmentExercises,
  createEquipment,
  updateEquipment,
  deleteEquipment,
};
