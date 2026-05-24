const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry,
  uploadAttachment,
  deleteAttachment,
  searchEntries,
} = require('../controllers/diary.controller');

router.use(authenticate);

router.get('/search', searchEntries);
router.get('/', getEntries);
router.get('/:id', getEntry);
router.post('/', createEntry);
router.put('/:id', updateEntry);
router.delete('/:id', deleteEntry);
router.post('/:id/media', upload.single('file'), uploadAttachment);
router.delete('/:id/media/:mediaId', deleteAttachment);

module.exports = router;
