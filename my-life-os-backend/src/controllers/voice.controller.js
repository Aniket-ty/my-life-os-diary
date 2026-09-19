const voiceService = require('../services/voice.service');
const gateway = require('../services/ai/gateway');

/**
 * Process a natural language voice/text command
 */
exports.processCommand = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { transcript } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'Command transcript is required' });
    }

    const result = await voiceService.processVoiceCommand(userId, transcript.trim());

    // If it is an action that does not require confirmation, we can optionally auto-execute it
    if (result.kind === 'action' && !result.requiresConfirmation && req.body.autoExecute !== false) {
      try {
        const executionMessage = await voiceService.executePending(result.serverCommandId, userId, { confirmed: true });
        return res.json({
          ...result,
          executed: true,
          executionMessage,
        });
      } catch (execErr) {
        // If auto-execution fails, return the action with confirmation required
        return res.json({
          ...result,
          executed: false,
          executionError: execErr.message,
        });
      }
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm and execute a pending voice action (e.g. for large expense or deletion)
 */
exports.confirmAction = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { serverCommandId, confirmed = true } = req.body;

    if (!serverCommandId) {
      return res.status(400).json({ error: 'serverCommandId is required' });
    }

    if (!confirmed) {
      voiceService.pendingStore.delete(serverCommandId);
      return res.json({ cancelled: true, message: 'Action cancelled.' });
    }

    const executionMessage = await voiceService.executePending(serverCommandId, userId, { confirmed: true });
    res.json({
      executed: true,
      message: executionMessage,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Transcribe raw audio to text
 */
exports.transcribeAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const text = await gateway.transcribeAudio(req.file.buffer, req.file.mimetype);
    res.json({ transcript: text || '' });
  } catch (error) {
    next(error);
  }
};

/**
 * Combined speech-to-intent pipeline (Audio -> Speech-to-text -> Command interpretation)
 */
exports.transcribeAndProcess = async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const transcript = await gateway.transcribeAudio(req.file.buffer, req.file.mimetype);
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'Could not transcribe speech. Please speak clearly.' });
    }

    const result = await voiceService.processVoiceCommand(userId, transcript.trim());

    if (result.kind === 'action' && !result.requiresConfirmation && req.body.autoExecute !== false) {
      try {
        const executionMessage = await voiceService.executePending(result.serverCommandId, userId, { confirmed: true });
        return res.json({
          transcript,
          ...result,
          executed: true,
          executionMessage,
        });
      } catch (execErr) {
        return res.json({
          transcript,
          ...result,
          executed: false,
          executionError: execErr.message,
        });
      }
    }

    res.json({
      transcript,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
