const router = require('express').Router();
const ctrl = require('../controllers/orders.controller');
const auth = require('../middleware/auth');
const allow = require('../middleware/roles');

router.use(auth, allow('owner', 'sales'));
router.get('/',             ctrl.list);
router.get('/:id',          ctrl.getOne);
router.put('/:id/status',   ctrl.setStatus);

module.exports = router;
