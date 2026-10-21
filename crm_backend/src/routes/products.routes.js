const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/products.controller');
const auth = require('../middleware/auth');
const allow = require('../middleware/roles');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `prod_${req.params.id}_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Everyone who sells can look at stock; only the owner changes it.
router.use(auth);
router.get('/',          allow('owner', 'sales'), ctrl.getAll);
router.get('/:id',       allow('owner', 'sales'), ctrl.getOne);
router.post('/',         allow('owner'), ctrl.create);
router.put('/:id',       allow('owner'), ctrl.update);
router.delete('/:id',    allow('owner'), ctrl.remove);
router.post('/:id/restock', allow('owner'), ctrl.restock);
router.post('/:id/image', allow('owner'), upload.single('image'), ctrl.uploadImage);

module.exports = router;
