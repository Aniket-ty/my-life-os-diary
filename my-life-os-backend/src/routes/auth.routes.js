const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register, login, refresh, me, setPin,
  completeOnboarding, onboardingStatus,
  getProfile, updateProfile, deleteAccount,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
});

const deleteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many account deletion attempts. Try again later.' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', (req, res) => res.json({ message: 'Logged out' }));
router.get('/me', authenticate, me);
router.put('/pin', authenticate, setPin);
router.post('/onboarding', authenticate, completeOnboarding);
router.get('/onboarding-status', authenticate, onboardingStatus);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.delete('/account', authenticate, deleteLimiter, deleteAccount);

module.exports = router;