const router = require('express').Router();
const ctrl = require('../controllers/alerts.controller');
const auth = require('../middleware/auth');

router.get('/', auth, ctrl.list);

module.exports = router;
