const prisma = require('../config/database');
const gateway = require('../services/ai/gateway');
const { uploadMedia } = require('../services/media.service');
const { createExpense, serializeExpense } = require('../services/expense.service');
const { calculateItemSplits } = require('../services/receiptSplit.service');
const { toNumber } = require('../utils/money');
const { DEFAULT_CURRENCY } = require('../utils/constants');

/**
 * Scan receipt image via OCR, save receipt draft, return structured extraction
 */
exports.scanReceipt = async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ error: 'Receipt image file is required' });
    }

    const mimeType = req.file.mimetype;
    let imageUrl = '';
    let cloudinaryId = null;

    // Try Cloudinary upload; if unconfigured, fallback to inline data URI for dev
    try {
      if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_CLOUD_NAME) {
        const uploadRes = await uploadMedia(req.file, 'photo');
        imageUrl = uploadRes.secure_url;
        cloudinaryId = uploadRes.public_id;
      } else {
        imageUrl = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;
      }
    } catch (uploadErr) {
      console.warn('Cloudinary upload warning, using data URI:', uploadErr.message);
      imageUrl = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;
    }

    // Call AI OCR gateway
    let extracted = null;
    try {
      const base64Data = req.file.buffer.toString('base64');
      extracted = await gateway.extractReceipt(base64Data, mimeType);
    } catch (ocrErr) {
      console.warn('OCR processing error:', ocrErr.message);
      extracted = {
        merchant: 'Unknown Merchant',
        date: new Date().toISOString().split('T')[0],
        currency: DEFAULT_CURRENCY,
        subtotal: 0,
        tax: 0,
        tip: 0,
        total: 0,
        items: [],
        confidence: 0.1,
      };
    }

    // Check duplicate receipt detection (merchant + date + total match)
    let possibleDuplicate = false;
    if (extracted.merchant && extracted.total && extracted.date) {
      const existing = await prisma.receipt.findFirst({
        where: {
          userId,
          merchant: { equals: extracted.merchant, mode: 'insensitive' },
          total: extracted.total,
          receiptDate: new Date(extracted.date),
        },
      });
      if (existing) {
        possibleDuplicate = true;
      }
    }

    const receipt = await prisma.receipt.create({
      data: {
        userId,
        imageUrl,
        cloudinaryId,
        merchant: extracted.merchant || null,
        receiptDate: extracted.date ? new Date(extracted.date) : new Date(),
        currency: extracted.currency || DEFAULT_CURRENCY,
        subtotal: extracted.subtotal != null ? extracted.subtotal : null,
        tax: extracted.tax != null ? extracted.tax : null,
        tip: extracted.tip != null ? extracted.tip : null,
        total: extracted.total != null ? extracted.total : null,
        items: extracted.items || [],
        rawText: extracted.rawText || null,
        extractedData: extracted,
        processingStatus: 'extracted',
      },
    });

    res.status(201).json({
      receipt,
      possibleDuplicate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List receipts for current user
 */
exports.getReceipts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const receipts = await prisma.receipt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        expense: { select: { id: true, title: true, amount: true, groupId: true } },
      },
    });
    res.json(receipts);
  } catch (error) {
    next(error);
  }
};

/**
 * Get receipt by ID
 */
exports.getReceiptById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        expense: {
          include: {
            splits: { include: { user: { select: { id: true, name: true } } } },
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!receipt || receipt.userId !== userId) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json(receipt);
  } catch (error) {
    next(error);
  }
};

/**
 * Update receipt details after user review screen edit
 */
exports.updateReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { merchant, receiptDate, currency, subtotal, tax, tip, total, items } = req.body;

    const existing = await prisma.receipt.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const updated = await prisma.receipt.update({
      where: { id },
      data: {
        merchant: merchant !== undefined ? merchant : existing.merchant,
        receiptDate: receiptDate ? new Date(receiptDate) : existing.receiptDate,
        currency: currency || existing.currency,
        subtotal: subtotal !== undefined ? subtotal : existing.subtotal,
        tax: tax !== undefined ? tax : existing.tax,
        tip: tip !== undefined ? tip : existing.tip,
        total: total !== undefined ? total : existing.total,
        items: items !== undefined ? items : existing.items,
        processingStatus: 'reviewed',
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * Preview/calculate item splits before saving
 */
exports.previewItemSplits = (req, res) => {
  try {
    const { items, subtotal, tax, tip, total, taxAllocation, allMemberIds } = req.body;
    const result = calculateItemSplits({
      items,
      subtotal,
      tax,
      tip,
      total,
      taxAllocation,
      allMemberIds,
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Convert reviewed receipt into an expense or group expense with item-level splits
 */
exports.createExpenseFromReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      title,
      category = 'Food',
      groupId,
      paidById,
      splitType = 'EQUAL',
      splits,
      itemSplits,
      taxAllocation = 'proportional',
    } = req.body;

    const receipt = await prisma.receipt.findUnique({ where: { id } });
    if (!receipt || receipt.userId !== userId) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    if (receipt.expenseId) {
      return res.status(400).json({ error: 'An expense has already been created from this receipt' });
    }

    const total = toNumber(receipt.total || receipt.subtotal || 0);
    if (total <= 0) {
      return res.status(400).json({ error: 'Receipt total must be greater than zero' });
    }

    let calculatedSplits = splits;

    // If itemSplits were provided, calculate each member's exact share
    if (Array.isArray(itemSplits) && itemSplits.length > 0) {
      const splitResult = calculateItemSplits({
        items: itemSplits,
        subtotal: toNumber(receipt.subtotal || total),
        tax: toNumber(receipt.tax || 0),
        tip: toNumber(receipt.tip || 0),
        total,
        taxAllocation,
      });

      calculatedSplits = Object.keys(splitResult.memberShares).map((uid) => ({
        userId: uid,
        amount: splitResult.memberShares[uid].total,
      }));
    }

    const expensePayload = {
      title: title || receipt.merchant || 'Scanned Receipt',
      amount: total,
      currency: receipt.currency || DEFAULT_CURRENCY,
      category,
      expenseDate: receipt.receiptDate || new Date(),
      description: `Bill from ${receipt.merchant || 'store'}`,
      source: 'OCR',
      receiptId: id,
      groupId: groupId || null,
      paidById: paidById || userId,
      splitType: calculatedSplits && calculatedSplits.length > 0 ? (splitType || 'EXACT') : 'EQUAL',
      splits: calculatedSplits,
    };

    const expense = await createExpense(userId, expensePayload);

    // Update receipt status
    await prisma.receipt.update({
      where: { id },
      data: {
        expenseId: expense.id,
        processingStatus: 'converted',
      },
    });

    res.status(201).json(serializeExpense(expense));
  } catch (error) {
    next(error);
  }
};
