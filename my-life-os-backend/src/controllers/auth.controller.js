const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const { calculateAll } = require('../services/calorie.service');
const prisma = new PrismaClient();

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY }
  );
  return { accessToken, refreshToken };
};

const serializeUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  createdAt: user.createdAt,
  onboardingCompleted: user.onboardingCompleted,
  age: user.age,
  gender: user.gender,
  heightCm: user.heightCm ? Number(user.heightCm) : null,
  activityLevel: user.activityLevel,
  fitnessGoal: user.fitnessGoal,
});

// POST /auth/register
const register = async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors });
  }

  const { email, password, name } = result.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const { accessToken, refreshToken } = generateTokens(user.id);

  res.status(201).json({
    user: serializeUser(user),
    accessToken,
    refreshToken,
  });
};

// POST /auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const { accessToken, refreshToken } = generateTokens(user.id);

  res.json({
    user: serializeUser(user),
    accessToken,
    refreshToken,
  });
};

// POST /auth/refresh
const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.userId);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

// GET /auth/me
const me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });
  res.json({ user: serializeUser(user) });
};

// PUT /auth/pin
const setPin = async (req, res) => {
  const { pin } = req.body;
  if (!pin || !/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be 4-6 digits' });
  }
  const pinHash = await bcrypt.hash(pin, 10);
  await prisma.user.update({
    where: { id: req.user.id },
    data: { pinHash },
  });
  res.json({ message: 'PIN set successfully' });
};

// POST /auth/onboarding
const completeOnboarding = async (req, res) => {
  const schema = z.object({
    age: z.number().int().min(10).max(100),
    gender: z.enum(['male', 'female']),
    heightCm: z.number().min(100).max(250),
    weightKg: z.number().min(30).max(300),
    bodyFatPct: z.number().min(2).max(70).optional(),
    muscleMassKg: z.number().min(10).max(150).optional(),
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'veryActive']),
    goal: z.enum(['lose', 'maintain', 'gain']),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors });
  }

  const { age, gender, heightCm, weightKg, bodyFatPct, muscleMassKg, activityLevel, goal } = result.data;

  const calc = calculateAll({
    weightKg,
    heightCm,
    age,
    gender,
    activityLevel,
    goal,
    bodyFatPct,
  });

  // Upsert fitness goals from calculated values
  await prisma.fitnessGoal.upsert({
    where: { userId: req.user.id },
    update: {
      dailyCalories: calc.calorieGoal,
      proteinG: calc.proteinG,
      carbsG: calc.carbsG,
      fatG: calc.fatG,
    },
    create: {
      userId: req.user.id,
      dailyCalories: calc.calorieGoal,
      proteinG: calc.proteinG,
      carbsG: calc.carbsG,
      fatG: calc.fatG,
    },
  });

  // Create the initial body scan
  const scan = await prisma.bodyScan.create({
    data: {
      userId: req.user.id,
      scanDate: new Date(),
      weight: weightKg,
      bodyFatPct: bodyFatPct || null,
      muscleMassKg: muscleMassKg || null,
      leanBodyMassKg: calc.leanBodyMass,
      bmr: calc.bmr,
      tee: calc.tdee,
      bwiScore: null,
      proteinKg: calc.proteinPerKgLean,
      notes: `Initial scan from onboarding (goal: ${goal})`,
    },
  });

  // Mark onboarding complete and store profile fields
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      onboardingCompleted: true,
      age,
      gender,
      heightCm,
      activityLevel,
      fitnessGoal: goal,
    },
  });

  res.status(201).json({
    user: serializeUser(user),
    scan,
    calculations: calc,
  });
};

// GET /auth/onboarding-status
const onboardingStatus = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { onboardingCompleted: true },
  });
  res.json({ onboardingCompleted: user.onboardingCompleted });
};

// GET /auth/profile
const getProfile = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      bodyScans: { orderBy: { scanDate: 'desc' }, take: 1 },
      fitnessGoals: true,
    },
  });

  res.json({
    user: serializeUser(user),
    latestScan: user.bodyScans[0] ? {
      id: user.bodyScans[0].id,
      scanDate: user.bodyScans[0].scanDate,
      weight: Number(user.bodyScans[0].weight),
      bodyFatPct: user.bodyScans[0].bodyFatPct ? Number(user.bodyScans[0].bodyFatPct) : null,
      bmr: user.bodyScans[0].bmr,
      tee: user.bodyScans[0].tee,
      muscleMassKg: user.bodyScans[0].muscleMassKg ? Number(user.bodyScans[0].muscleMassKg) : null,
    } : null,
    goals: user.fitnessGoals
      ? {
          dailyCalories: user.fitnessGoals.dailyCalories,
          proteinG: user.fitnessGoals.proteinG ? Number(user.fitnessGoals.proteinG) : null,
          carbsG: user.fitnessGoals.carbsG ? Number(user.fitnessGoals.carbsG) : null,
          fatG: user.fitnessGoals.fatG ? Number(user.fitnessGoals.fatG) : null,
        }
      : null,
  });
};

// PUT /auth/profile
const updateProfile = async (req, res) => {
  const { name, age, gender, heightCm, activityLevel, goal } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      name,
      age,
      gender,
      heightCm,
      activityLevel,
      fitnessGoal: goal,
    },
  });

  // If activity level or goal changed, recalculate goals from latest scan
  if ((activityLevel || goal) && user) {
    const latestScan = await prisma.bodyScan.findFirst({
      where: { userId: req.user.id },
      orderBy: { scanDate: 'desc' },
    });
    if (latestScan) {
      const weight = Number(latestScan.weight);
      const height = user.heightCm ? Number(user.heightCm) : null;
      if (weight && height && user.age && user.gender) {
        const calc = calculateAll({
          weightKg: weight,
          heightCm: height,
          age: user.age,
          gender: user.gender,
          activityLevel: user.activityLevel || 'moderate',
          goal: user.fitnessGoal || 'maintain',
          bodyFatPct: latestScan.bodyFatPct ? Number(latestScan.bodyFatPct) : undefined,
        });
        await prisma.fitnessGoal.upsert({
          where: { userId: req.user.id },
          update: {
            dailyCalories: calc.calorieGoal,
            proteinG: calc.proteinG,
            carbsG: calc.carbsG,
            fatG: calc.fatG,
          },
          create: {
            userId: req.user.id,
            dailyCalories: calc.calorieGoal,
            proteinG: calc.proteinG,
            carbsG: calc.carbsG,
            fatG: calc.fatG,
          },
        });
      }
    }
  }

  res.json({ user: serializeUser(user) });
};

// DELETE /auth/account
const deleteAccount = async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password confirmation is required' });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ error: 'Incorrect password' });

  // Clean up all media from Cloudinary before deleting user
  const attachments = await prisma.mediaAttachment.findMany({
    where: { userId: req.user.id },
  });

  const { deleteMedia } = require('../services/media.service');
  for (const attachment of attachments) {
    await deleteMedia(attachment.cloudinaryId, attachment.mediaType);
  }

  await prisma.user.delete({ where: { id: req.user.id } });

  res.json({ message: 'Account permanently deleted' });
};

module.exports = {
  register, login, refresh, me, setPin,
  completeOnboarding, onboardingStatus,
  getProfile, updateProfile, deleteAccount,
};