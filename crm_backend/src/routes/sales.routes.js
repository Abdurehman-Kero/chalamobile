const router = require('express').Router();
const ctrl = require('../controllers/sales.controller');
const auth = require('../middleware/auth');
const allow = require('../middleware/roles');

router.use(auth, allow('owner', 'sales'));
router.post('/',    ctrl.createSale);
router.get('/',     ctrl.getAll);
router.get('/:id',  ctrl.getOne);

module.exports = router;
