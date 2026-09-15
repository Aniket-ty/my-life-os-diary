const prisma = require('../config/database');
const { calculateAll } = require('../services/calorie.service');

const getScans = async (req, res) => {
  try {
    const scans = await prisma.bodyScan.findMany({
      where: { userId: req.user.id },
      orderBy: { scanDate: 'desc' },
    });
    res.json(scans);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const createScan = async (req, res) => {
  try {
    const {
      scanDate, weight, heightCm, bodyFatPct, muscleMassKg, leanBodyMassKg,
      bmr, tee, visceralFat, bwiScore, bioAge, proteinKg, notes,
    } = req.body;

    if (!weight) return res.status(400).json({ error: 'weight is required' });

    // Auto-compute BMR/TEE and daily goals when the user only gives weight + height.
    // Falls back to the profile height stored at onboarding.
    const height = heightCm ? Number(heightCm) : null;
    let calc = null;
    const needsCalc = !bmr || !tee;
    if (needsCalc) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (user && (height || user.heightCm) && user.age && user.gender) {
        calc = calculateAll({
          weightKg: Number(weight),
          heightCm: height || Number(user.heightCm),
          age: user.age,
          gender: user.gender,
          activityLevel: user.activityLevel || 'moderate',
          goal: user.fitnessGoal || 'maintain',
          bodyFatPct: bodyFatPct ? Number(bodyFatPct) : undefined,
        });

        // Keep the daily nutrition targets in sync with the latest metrics
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

    const scan = await prisma.bodyScan.create({
      data: {
        userId: req.user.id,
        scanDate: scanDate ? new Date(scanDate) : new Date(),
        weight: Number(weight),
        bodyFatPct: bodyFatPct ? Number(bodyFatPct) : null,
        muscleMassKg: muscleMassKg ? Number(muscleMassKg) : null,
        leanBodyMassKg: leanBodyMassKg ? Number(leanBodyMassKg)
          : calc?.leanBodyMass ?? null,
        bmr: bmr ? Number(bmr) : calc?.bmr ?? null,
        tee: tee ? Number(tee) : calc?.tdee ?? null,
        visceralFat: visceralFat ? Number(visceralFat) : null,
        bwiScore: bwiScore ? Number(bwiScore) : null,
        bioAge: bioAge ? Number(bioAge) : null,
        proteinKg: proteinKg ? Number(proteinKg) : calc?.proteinPerKgLean ?? null,
        notes,
      },
    });
    res.status(201).json(scan);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const deleteScan = async (req, res) => {
  try {
    const scan = await prisma.bodyScan.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    await prisma.bodyScan.delete({ where: { id: req.params.id } });
    res.json({ message: 'Scan deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { getScans, createScan, deleteScan };
