const prisma = require('../config/database');

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
      scanDate, weight, bodyFatPct, muscleMassKg, leanBodyMassKg,
      bmr, tee, visceralFat, bwiScore, bioAge, proteinKg, notes,
    } = req.body;

    if (!weight) return res.status(400).json({ error: 'weight is required' });

    const scan = await prisma.bodyScan.create({
      data: {
        userId: req.user.id,
        scanDate: scanDate ? new Date(scanDate) : new Date(),
        weight: Number(weight),
        bodyFatPct: bodyFatPct ? Number(bodyFatPct) : null,
        muscleMassKg: muscleMassKg ? Number(muscleMassKg) : null,
        leanBodyMassKg: leanBodyMassKg ? Number(leanBodyMassKg) : null,
        bmr: bmr ? Number(bmr) : null,
        tee: tee ? Number(tee) : null,
        visceralFat: visceralFat ? Number(visceralFat) : null,
        bwiScore: bwiScore ? Number(bwiScore) : null,
        bioAge: bioAge ? Number(bioAge) : null,
        proteinKg: proteinKg ? Number(proteinKg) : null,
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
