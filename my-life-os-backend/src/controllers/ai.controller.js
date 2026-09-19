const prisma = require('../config/database');
const { chatWithAI, recognizeHandwriting } = require('../services/ai.service');
const { v4: uuidv4 } = require('../utils/uuid');

const recognizeHandwritingText = async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'image (base64 string) is required' });
    }

    // Accept raw base64, optionally prefixed with a data URI
    let base64 = image;
    const dataUriMatch = image.match(/^data:[^;]+;base64,(.+)$/s);
    if (dataUriMatch) base64 = dataUriMatch[1];

    const allowedMime = mimeType && /^image\/(png|jpe?g|webp)$/.test(mimeType)
      ? mimeType.replace('jpg', 'jpeg')
      : 'image/png';

    const result = await recognizeHandwriting(base64, allowedMime);
    res.json(result);
  } catch (e) {
    res.status(502).json({ error: e.message || 'Could not transcribe handwriting' });
  }
};

const chat = async (req, res) => {
  try {
    const { message, sessionId, contextType } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const sid = sessionId || uuidv4();

    // Fetch last 10 messages in this session for context
    const history = await prisma.chatMessage.findMany({
      where: { userId: req.user.id, sessionId: sid },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    // Fetch user's daily nutrition summary for context
    const today = new Date();
    const nutritionLogs = await prisma.nutritionLog.findMany({
      where: { userId: req.user.id, logDate: today },
    });
    const goals = await prisma.fitnessGoal.findUnique({
      where: { userId: req.user.id },
    });

    const caloriesConsumed = nutritionLogs.reduce((s, l) => s + l.calories, 0);

    // Build context string for AI
    const userContext = `
User's fitness goals: ${goals?.dailyCalories || 'not set'} kcal/day, protein: ${goals?.proteinG || 'not set'}g
Today's calories consumed: ${caloriesConsumed} kcal
Today's food count: ${nutritionLogs.length} items logged
    `.trim();

    // Save user message
    await prisma.chatMessage.create({
      data: {
        userId: req.user.id,
        sessionId: sid,
        role: 'user',
        content: message,
        contextType: contextType || 'general',
      },
    });

    // Get AI response
    const aiResponse = await chatWithAI(message, history, userContext);

    // Save AI response
    const savedResponse = await prisma.chatMessage.create({
      data: {
        userId: req.user.id,
        sessionId: sid,
        role: 'assistant',
        content: aiResponse.text,
        contextType: contextType || 'general',
        actionTaken: !!aiResponse.action,
      },
    });

    res.json({
      sessionId: sid,
      message: aiResponse.text,
      action: aiResponse.action || null,
      messageId: savedResponse.id,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const where = { userId: req.user.id };
    if (sessionId) where.sessionId = sessionId;

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const addFoodFromAI = async (req, res) => {
  try {
    const { foodName, calories, proteinG, carbsG, fatG, mealType, quantity } = req.body;
    if (!foodName || !calories || !mealType) {
      return res.status(400).json({ error: 'foodName, calories and mealType required' });
    }

    const log = await prisma.nutritionLog.create({
      data: {
        userId: req.user.id,
        foodName,
        mealType,
        calories: Number(calories),
        proteinG: proteinG ? Number(proteinG) : null,
        carbsG: carbsG ? Number(carbsG) : null,
        fatG: fatG ? Number(fatG) : null,
        quantity,
        logDate: new Date(),
        aiSuggested: true,
      },
    });
    res.status(201).json({ message: `${foodName} added to your log!`, log });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const addWorkoutFromAI = async (req, res) => {
  try {
    const { workoutName, exercises } = req.body;
    if (!exercises?.length) return res.status(400).json({ error: 'exercises array required' });

    const workout = await prisma.workout.create({
      data: {
        userId: req.user.id,
        name: workoutName || 'AI Suggested Workout',
        workoutDate: new Date(),
        status: 'planned',
        exercises: {
          create: exercises.map((ex, i) => ({
            exerciseName: ex.exerciseName,
            sets: ex.sets,
            reps: ex.reps != null ? String(ex.reps) : null,
            weightKg: ex.weightKg,
            orderIndex: i,
          })),
        },
      },
      include: { exercises: true },
    });
    res.status(201).json({ message: 'Workout added to your journal!', workout });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const clearHistory = async (req, res) => {
  try {
    const { sessionId } = req.query;
    const where = { userId: req.user.id };
    if (sessionId) where.sessionId = sessionId;
    await prisma.chatMessage.deleteMany({ where });
    res.json({ message: 'Chat history cleared' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { chat, getChatHistory, addFoodFromAI, addWorkoutFromAI, clearHistory, recognizeHandwritingText };
