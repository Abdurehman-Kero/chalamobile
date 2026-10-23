const router = require('express').Router();
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/public.controller');
const { requireShopAccount } = require('../middleware/shopAuth');

// The storefront's address (comma-separated for several). Unset means any origin,
// which is fine while developing; set it on the host before going live.
const origins = (process.env.STOREFRONT_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
router.use(cors({ origin: origins.length ? origins : '*' }));

const limiter = (max, windowMinutes, message) => rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  limit: max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: message, code: 'TOO_MANY_REQUESTS' },
});
const authLimit = limiter(20, 15, 'Too many attempts. Please wait a few minutes and try again.');
const orderLimit = limiter(15, 60, 'Too many orders from this connection. Please call the shop.');

// Browsing: no account needed.
router.get('/home',          ctrl.home);
router.get('/categories',    ctrl.categories);
router.get('/products',      ctrl.listProducts);
router.get('/products/:id',  ctrl.getProduct);

// Accounts.
router.post('/auth/register', authLimit, ctrl.register);
router.post('/auth/login',    authLimit, ctrl.login);
router.get('/auth/me',        requireShopAccount, ctrl.me);

// Signed-in customers only.
router.post('/orders',              requireShopAccount, orderLimit, ctrl.createOrder);
router.get('/orders',               requireShopAccount, ctrl.myOrders);
router.get('/orders/:id',           requireShopAccount, ctrl.myOrder);
router.get('/notifications',        requireShopAccount, ctrl.notifications);
router.post('/notifications/read',  requireShopAccount, ctrl.markNotificationsRead);

module.exports = router;
