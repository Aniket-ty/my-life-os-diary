const prisma = require('../config/database');

/**
 * Track non-sensitive fitness & equipment events.
 */
const trackAnalyticsEvent = async (req, res) => {
  try {
    const { eventName, properties = {} } = req.body;

    if (!eventName) {
      return res.status(400).json({ error: 'eventName is required' });
    }

    // In a production system, this could pipe to Mixpanel / PostHog / DataDog.
    // Here we also record scans or audit items in the database if relevant.
    console.log(`[FITNESS_ANALYTICS] user=${req.user?.id || 'anon'} event=${eventName}`, properties);

    res.status(202).json({ status: 'recorded', eventName });
  } catch (err) {
    console.error('Analytics event error:', err);
    res.status(500).json({ error: 'Failed to record event' });
  }
};

module.exports = { trackAnalyticsEvent };
