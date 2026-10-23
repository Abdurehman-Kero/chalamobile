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

// Photos are held in memory just long enough to hand them to the image host.
const photos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error('Only JPG, PNG or WebP photos are allowed'), { status: 400 }));
  },
});

// Everyone who sells can look at stock; only the owner changes it.
router.use(auth);
router.get('/',          allow('owner', 'sales'), ctrl.getAll);
router.get('/:id',       allow('owner', 'sales'), ctrl.getOne);
router.post('/',         allow('owner'), ctrl.create);
router.put('/:id',       allow('owner'), ctrl.update);
router.delete('/:id',    allow('owner'), ctrl.remove);
router.post('/:id/restock', allow('owner'), ctrl.restock);
router.post('/:id/image', allow('owner'), upload.single('image'), ctrl.uploadImage);
router.post('/:id/images', allow('owner'), photos.array('images', 4), ctrl.uploadImages);
router.delete('/:id/images/:imageId', allow('owner'), ctrl.deleteImage);
router.put('/:id/images/:imageId/cover', allow('owner'), ctrl.setCover);

module.exports = router;
