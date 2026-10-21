const router = require('express').Router();
const ctrl = require('../controllers/repairs.controller');
const auth = require('../middleware/auth');
const allow = require('../middleware/roles');

// Repairs are the owner's and the technicians' work; the sales desk has no access.
router.use(auth, allow('owner', 'technician'));
router.get('/',              ctrl.getAll);
router.post('/',             ctrl.create);
router.get('/:id',           ctrl.getOne);
router.patch('/:id',         ctrl.update);
router.patch('/:id/status',  ctrl.advanceStatus);
router.patch('/:id/assign',  allow('owner'), ctrl.assign);

module.exports = router;
