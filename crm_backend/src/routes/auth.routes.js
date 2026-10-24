const router = require('express').Router();
const Joi = require('joi');
const ctrl = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Slows down anyone guessing passwords, here and on the "change my password" call.
const attempts = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT) || 30,   // raised only by the automated tests
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.', code: 'TOO_MANY_REQUESTS' },
});

const loginSchema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().min(3).required() });

const profileSchema = Joi.object({
  name: Joi.string().trim().max(120),
  email: Joi.string().trim().max(190),
  password: Joi.string().max(200),
  current_password: Joi.string().max(200),
}).min(1);

const forgotSchema = Joi.object({ email: Joi.string().email().required() });
const resetSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().trim().min(4).max(200).required(),
  password: Joi.string().min(6).max(200).required(),
});

router.post('/forgot', attempts, validate(forgotSchema), ctrl.forgot);
router.post('/reset', attempts, validate(resetSchema), ctrl.reset);
router.post('/login', attempts, validate(loginSchema), ctrl.login);
router.get('/me', auth, ctrl.me);
router.patch('/me', attempts, auth, validate(profileSchema), ctrl.updateMe);

module.exports = router;
