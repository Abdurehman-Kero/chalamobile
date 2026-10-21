const router = require('express').Router();
const ctrl = require('../controllers/customers.controller');
const auth = require('../middleware/auth');
const allow = require('../middleware/roles');

router.use(auth);
router.get('/',     allow('owner', 'sales'), ctrl.getAll);
router.post('/',    allow('owner', 'sales'), ctrl.create);
router.get('/:id',  allow('owner', 'sales'), ctrl.getOne);
router.put('/:id',  allow('owner'), ctrl.update);

module.exports = router;
