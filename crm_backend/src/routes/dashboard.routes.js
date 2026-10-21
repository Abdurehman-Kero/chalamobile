const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const auth = require('../middleware/auth');

// Every role has a Home screen; the controller decides what each one sees.
router.use(auth);
router.get('/metrics',    ctrl.getMetrics);
router.get('/weekly',     ctrl.getWeekly);
router.get('/activity',   ctrl.getActivity);

module.exports = router;
