const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voice.controller');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate);

router.post('/command', voiceController.processCommand);
router.post('/confirm', voiceController.confirmAction);
router.post('/transcribe', upload.single('audio'), voiceController.transcribeAudio);
router.post('/listen', upload.single('audio'), voiceController.transcribeAndProcess);

module.exports = router;
