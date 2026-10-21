const router = require('express').Router();
const ctrl = require('../controllers/users.controller');
const auth = require('../middleware/auth');
const allow = require('../middleware/roles');

router.use(auth, allow('owner'));
router.get('/',       ctrl.list);
router.post('/',      ctrl.create);
router.patch('/:id',  ctrl.update);

module.exports = router;
