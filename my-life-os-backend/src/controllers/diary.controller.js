const prisma = require('../config/database');
const { uploadMedia, deleteMedia } = require('../services/media.service');

// Get all diary entries for the logged-in user
const getEntries = async (req, res) => {
  try {
    const { date, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = { userId: req.user.id };
    if (date) where.entryDate = new Date(date);

    const [entries, total] = await Promise.all([
      prisma.diaryEntry.findMany({
        where,
        include: { attachments: true },
        orderBy: { entryDate: 'desc' },
        skip: Number(skip),
        take: Number(limit),
      }),
      prisma.diaryEntry.count({ where }),
    ]);

    res.json({ entries, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single diary entry
const getEntry = async (req, res) => {
  try {
    const entry = await prisma.diaryEntry.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { attachments: true },
    });

    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new diary entry
const createEntry = async (req, res) => {
  try {
    const { title, content, mood, weather, entryDate, isPinned } = req.body;

    if (!content) return res.status(400).json({ error: 'Content is required' });

    const entry = await prisma.diaryEntry.create({
      data: {
        userId: req.user.id,
        title,
        content,
        mood,
        weather,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        isPinned: isPinned || false,
      },
      include: { attachments: true },
    });

    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update diary entry
const updateEntry = async (req, res) => {
  try {
    const existing = await prisma.diaryEntry.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!existing) return res.status(404).json({ error: 'Entry not found' });

    const { title, content, mood, weather, isPinned } = req.body;

    const entry = await prisma.diaryEntry.update({
      where: { id: req.params.id },
      data: { title, content, mood, weather, isPinned },
      include: { attachments: true },
    });

    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete diary entry (also deletes all attachments from Cloudinary)
const deleteEntry = async (req, res) => {
  try {
    const entry = await prisma.diaryEntry.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { attachments: true },
    });

    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    // Delete all media from Cloudinary first
    for (const attachment of entry.attachments) {
      await deleteMedia(attachment.cloudinaryId, attachment.mediaType);
    }

    await prisma.diaryEntry.delete({ where: { id: req.params.id } });
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upload media attachment to a diary entry
const uploadAttachment = async (req, res) => {
  try {
    const entry = await prisma.diaryEntry.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { mediaType } = req.body;
    if (!['photo', 'audio', 'video', 'document'].includes(mediaType)) {
      return res.status(400).json({ error: 'mediaType must be photo, audio, video, or document' });
    }

    const uploaded = await uploadMedia(req.file, mediaType);

    const attachment = await prisma.mediaAttachment.create({
      data: {
        userId: req.user.id,
        entryId: req.params.id,
        mediaType,
        cloudinaryUrl: uploaded.secure_url,
        cloudinaryId: uploaded.public_id,
        fileName: req.file.originalname,
        fileSizeKb: Math.round(req.file.size / 1024),
        durationSec: uploaded.duration ? Math.round(uploaded.duration) : null,
      },
    });

    res.status(201).json(attachment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a specific attachment
const deleteAttachment = async (req, res) => {
  try {
    const attachment = await prisma.mediaAttachment.findFirst({
      where: { id: req.params.mediaId, userId: req.user.id },
    });

    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

    await deleteMedia(attachment.cloudinaryId, attachment.mediaType);
    await prisma.mediaAttachment.delete({ where: { id: req.params.mediaId } });

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Search diary entries by keyword
const searchEntries = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query is required' });

    const entries = await prisma.diaryEntry.findMany({
      where: {
        userId: req.user.id,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { attachments: true },
      orderBy: { entryDate: 'desc' },
    });

    res.json({ entries, total: entries.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry,
  uploadAttachment,
  deleteAttachment,
  searchEntries,
};
