const router = require('express').Router();
const Joi = require('joi');
const ctrl = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');

const loginSchema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().min(3).required() });

router.post('/login', validate(loginSchema), ctrl.login);
router.get('/me', auth, ctrl.me);

module.exports = router;
