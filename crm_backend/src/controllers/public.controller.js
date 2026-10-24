const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const db = require('../db/knex');
const { LOW_STOCK_AT } = require('../config');
const { signShopToken } = require('../middleware/shopAuth');
const { HttpError } = require('../services/sales');

// Everything here is read by strangers on the internet. Only fields written below
// ever leave the server: never the cost price, the shop's private notes or the
// exact stock count.

const TRENDING_DAYS = 90;
const MAX_QTY_PER_ITEM = 10;

const stockState = (stock) => (stock <= 0 ? 'out' : stock <= LOW_STOCK_AT ? 'low' : 'in');

// Visible products with how many were sold lately and their cover photo.
function visibleProducts() {
  const since = new Date(Date.now() - TRENDING_DAYS * 86400000);
  const sold = db('sale_items')
    .join('sales', 'sales.id', 'sale_items.sale_id')
    .where('sales.created_at', '>=', since)
    .groupBy('sale_items.product_id')
    .select('sale_items.product_id', db.raw('SUM(sale_items.qty)::int AS sold'))
    .as('s');
  const cover = db('product_images').where('is_primary', true).select('product_id', 'url').as('c');
  return db('products')
    .leftJoin(sold, 's.product_id', 'products.id')
    .leftJoin(cover, 'c.product_id', 'products.id')
    .where({ 'products.is_active': true, 'products.is_published': true })
    .select(
      'products.id', 'products.name', 'products.brand', 'products.category', 'products.specs',
      'products.storage_gb', 'products.ram_gb', 'products.selling_price', 'products.stock',
      'products.created_at', db.raw('COALESCE(s.sold, 0)::int AS sold'), 'c.url AS image',
    );
}

const toCard = (p) => ({
  id: p.id,
  name: p.name,
  brand: p.brand,
  category: p.category,
  specs: p.specs,
  price: Number(p.selling_price) || 0,
  image: p.image || null,
  stock: stockState(Number(p.stock)),
  sold: p.sold || 0,
  created_at: p.created_at,
});

// ── Catalogue ─────────────────────────────────────────

const SORTS = {
  top:        [['sold', 'desc'], ['products.created_at', 'desc']],
  featured:   [['products.selling_price', 'desc']],
  new:        [['products.created_at', 'desc']],
  price_asc:  [['products.selling_price', 'asc']],
  price_desc: [['products.selling_price', 'desc']],
  name:       [['products.name', 'asc']],
};
const TAB_SORT = { all: 'name', top: 'top', featured: 'featured', new: 'new' };

exports.listProducts = async (req, res) => {
  try {
    const { q = '', category = '', brand = '' } = req.query;
    const tab = TAB_SORT[req.query.tab] ? req.query.tab : 'all';
    const sort = SORTS[req.query.sort] ? req.query.sort : TAB_SORT[tab];
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 48);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const query = visibleProducts();
    const term = String(q).trim().slice(0, 80);
    if (term) {
      query.where(function () {
        this.whereILike('products.name', `%${term}%`)
          .orWhereILike('products.brand', `%${term}%`)
          .orWhereILike('products.category', `%${term}%`);
      });
    }
    if (category) query.where('products.category', String(category));
    if (brand) query.where('products.brand', String(brand));
    const min = Number(req.query.min_price), max = Number(req.query.max_price);
    if (req.query.min_price !== undefined && req.query.min_price !== '' && Number.isFinite(min)) query.where('products.selling_price', '>=', min);
    if (req.query.max_price !== undefined && req.query.max_price !== '' && Number.isFinite(max)) query.where('products.selling_price', '<=', max);
    if (req.query.in_stock === '1' || req.query.in_stock === 'true') query.where('products.stock', '>', 0);

    const [{ count }] = await query.clone().clearSelect().clearOrder().count({ count: '*' });
    // Things that are sold out go to the end, whatever the sort.
    query.orderByRaw('(products.stock <= 0) ASC');
    SORTS[sort].forEach(([col, dir]) => query.orderBy(col, dir));
    const rows = await query.limit(limit).offset((page - 1) * limit);

    const total = Number(count);
    res.json({ products: rows.map(toCard), total, page, has_more: page * limit < total });
  } catch (err) {
    console.error('[public.listProducts]', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

// What the shop page can filter by: categories, brands and the price range of what is for sale.
exports.filters = async (req, res) => {
  try {
    const base = () => db('products').where({ is_active: true, is_published: true });
    const categories = await base().whereNotNull('category').groupBy('category')
      .select('category AS name', db.raw('COUNT(*)::int AS count')).orderBy('count', 'desc');
    const brands = await base().whereNotNull('brand').groupBy('brand')
      .select('brand AS name', db.raw('COUNT(*)::int AS count')).orderBy('count', 'desc');
    const [range] = await base().min({ min: 'selling_price' }).max({ max: 'selling_price' });
    res.json({ categories, brands, price: { min: Math.floor(Number(range.min) || 0), max: Math.ceil(Number(range.max) || 0) } });
  } catch (err) {
    console.error('[public.filters]', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

// One call for the whole home page, so a phone on a slow network makes a single request.
exports.home = async (req, res) => {
  try {
    const rows = (await visibleProducts().limit(400)).map(toCard);
    const available = rows.filter(p => p.stock !== 'out');
    const take = (list, n, skip = new Set()) => list.filter(p => !skip.has(p.id)).slice(0, n);

    const byTop = [...available].sort((a, b) => b.sold - a.sold || new Date(b.created_at) - new Date(a.created_at));
    const trending = take(byTop, 10);
    const byPrice = [...available].sort((a, b) => b.price - a.price);
    const featured = take(byPrice, 10);

    // "Items you'll love": best sellers not already shown above, topped up with new arrivals.
    const shown = new Set([...trending, ...featured].map(p => p.id));
    const byNew = [...available].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const picks = take([...byTop, ...byNew], 10, shown).filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);

    const counts = {};
    rows.forEach(p => { if (p.category) counts[p.category] = (counts[p.category] || 0) + 1; });
    const categories = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    // The hero shows the most valuable product that has a photo.
    const hero = byPrice.find(p => p.image) || byPrice[0] || null;

    res.json({ hero, trending, featured, picks, categories, total: rows.length });
  } catch (err) {
    console.error('[public.home]', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

exports.categories = async (req, res) => {
  try {
    const rows = await db('products')
      .where({ is_active: true, is_published: true }).whereNotNull('category')
      .groupBy('category').select('category AS name', db.raw('COUNT(*)::int AS count')).orderBy('count', 'desc');
    res.json({ categories: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });
    const row = await visibleProducts().where('products.id', id).first();
    if (!row) return res.status(404).json({ error: 'Product not found', code: 'NOT_FOUND' });

    const photos = await db('product_images').where({ product_id: id })
      .orderBy([{ column: 'is_primary', order: 'desc' }, 'sort_order', 'id']).select('id', 'url');
    const related = await visibleProducts()
      .where('products.category', row.category).whereNot('products.id', id).where('products.stock', '>', 0)
      .orderBy('sold', 'desc').limit(8);

    res.json({
      product: {
        ...toCard(row),
        storage_gb: row.storage_gb, ram_gb: row.ram_gb,
        images: photos,
      },
      related: related.map(toCard),
    });
  } catch (err) {
    console.error('[public.getProduct]', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

// ── Accounts ──────────────────────────────────────────

// Accepts 0911..., 911..., +251911..., 251911... and stores +251911xxxxxxx.
function normalizePhone(input) {
  const m = String(input || '').replace(/[\s\-()]/g, '').match(/^(?:\+?251|0)?([79]\d{8})$/);
  return m ? `+251${m[1]}` : null;
}

const phoneRule = Joi.string().custom((v, helpers) => normalizePhone(v) || helpers.error('any.invalid'))
  .messages({ 'any.invalid': 'Enter a valid Ethiopian phone number, like 0911 234 567' });

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({ 'string.min': 'Enter your full name', 'any.required': 'Enter your name' }),
  phone: phoneRule.required(),
  email: Joi.string().trim().email().max(150).allow('', null),
  password: Joi.string().min(6).max(72).required().messages({ 'string.min': 'Password must be at least 6 characters' }),
});
const loginSchema = Joi.object({ phone: phoneRule.required(), password: Joi.string().max(72).required() });

const publicAccount = (a) => ({ id: a.id, name: a.name, phone: a.phone, email: a.email });
const invalid = (res, error) => res.status(400).json({ error: error.details.map(d => d.message).join(', '), code: 'VALIDATION_ERROR' });

exports.register = async (req, res) => {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) return invalid(res, error);
  try {
    const phone = normalizePhone(value.phone);
    if (await db('shop_accounts').where({ phone }).first()) {
      return res.status(409).json({ error: 'An account with this phone number already exists. Please sign in.', code: 'PHONE_TAKEN' });
    }
    const [account] = await db('shop_accounts').insert({
      name: value.name, phone, email: value.email || null, password_hash: await bcrypt.hash(value.password, 10),
    }).returning('*');
    res.status(201).json({ token: signShopToken(account), account: publicAccount(account) });
  } catch (err) {
    console.error('[public.register]', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

exports.login = async (req, res) => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) return invalid(res, error);
  try {
    const account = await db('shop_accounts').where({ phone: normalizePhone(value.phone) }).first();
    if (!account || !(await bcrypt.compare(value.password, account.password_hash))) {
      return res.status(401).json({ error: 'Wrong phone number or password', code: 'INVALID_CREDS' });
    }
    res.json({ token: signShopToken(account), account: publicAccount(account) });
  } catch (err) {
    console.error('[public.login]', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

exports.me = (req, res) => res.json({ account: publicAccount(req.account) });

// ── Orders ────────────────────────────────────────────

const orderSchema = Joi.object({
  items: Joi.array().min(1).max(20).items(Joi.object({
    product_id: Joi.number().integer().required(),
    qty: Joi.number().integer().min(1).max(MAX_QTY_PER_ITEM).required(),
  })).required().messages({ 'array.min': 'Your cart is empty' }),
  name: Joi.string().trim().min(2).max(100).required().messages({ 'string.min': 'Enter your full name' }),
  phone: phoneRule.required(),
  delivery_method: Joi.string().valid('delivery', 'pickup').required(),
  address: Joi.when('delivery_method', {
    is: 'delivery',
    then: Joi.string().trim().min(5).max(300).required().messages({ 'string.min': 'Enter your delivery address', 'string.empty': 'Enter your delivery address' }),
    otherwise: Joi.string().trim().max(300).allow('', null),
  }),
  payment_method: Joi.string().valid('telebirr', 'cbe', 'cash').required(),
  note: Joi.string().trim().max(500).allow('', null),
});

const withItems = async (orders) => {
  if (!orders.length) return [];
  const items = await db('order_items').whereIn('order_id', orders.map(o => o.id)).orderBy('id');
  return orders.map(o => ({ ...formatOrder(o), items: items.filter(i => i.order_id === o.id).map(formatItem) }));
};
const formatItem = (i) => ({ product_id: i.product_id, name: i.product_name, qty: i.qty, unit_price: Number(i.unit_price) });
const formatOrder = (o) => ({
  id: o.id, order_number: o.order_number, status: o.status, total: Number(o.total),
  delivery_method: o.delivery_method, address: o.address, payment_method: o.payment_method,
  note: o.note, customer_name: o.customer_name, phone: o.phone, created_at: o.created_at, updated_at: o.updated_at,
});

exports.createOrder = async (req, res) => {
  const { error, value } = orderSchema.validate(req.body, { abortEarly: false });
  if (error) return invalid(res, error);
  const clientKey = String(req.headers['idempotency-key'] || '').slice(0, 64) || null;

  try {
    if (clientKey) {
      const dup = await db('orders').where({ account_id: req.account.id, client_key: clientKey }).first();
      if (dup) return res.status(200).json({ order: (await withItems([dup]))[0] });
    }

    const order = await db.transaction(async (trx) => {
      // Merge repeated lines so the stock check sees the true quantity.
      const wanted = new Map();
      value.items.forEach(i => wanted.set(i.product_id, (wanted.get(i.product_id) || 0) + i.qty));

      const products = await trx('products').whereIn('id', [...wanted.keys()]).where({ is_active: true, is_published: true });
      const lines = [];
      for (const [productId, qty] of wanted) {
        const p = products.find(x => x.id === productId);
        if (!p) throw new HttpError(400, 'One of the items in your cart is no longer available');
        if (p.stock < qty) {
          throw new HttpError(400, p.stock > 0 ? `Only ${p.stock} left of ${p.name}` : `${p.name} is sold out`);
        }
        // The price always comes from the database; whatever the browser sent is ignored.
        lines.push({ product_id: p.id, product_name: p.name, qty, unit_price: Number(p.selling_price) });
      }
      const total = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0);

      const [created] = await trx('orders').insert({
        order_number: `t${crypto.randomBytes(8).toString('hex')}`,   // replaced below, once the id is known
        account_id: req.account.id,
        customer_name: value.name,
        phone: normalizePhone(value.phone),
        delivery_method: value.delivery_method,
        address: value.delivery_method === 'delivery' ? value.address : null,
        payment_method: value.payment_method,
        note: value.note || null,
        total,
        client_key: clientKey,
      }).returning('*');
      const orderNumber = `CM-${String(created.id).padStart(5, '0')}`;
      await trx('orders').where({ id: created.id }).update({ order_number: orderNumber });
      await trx('order_items').insert(lines.map(l => ({ ...l, order_id: created.id })));
      await trx('notifications').insert({
        account_id: req.account.id, order_id: created.id,
        title: 'Order received',
        body: `Thank you! We got order ${orderNumber} and will call you soon to confirm.`,
      });
      return { ...created, order_number: orderNumber };
    });

    res.status(201).json({ order: (await withItems([order]))[0] });
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, code: 'ORDER_REJECTED' });
    console.error('[public.createOrder]', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

exports.myOrders = async (req, res) => {
  try {
    const orders = await db('orders').where({ account_id: req.account.id }).orderBy('created_at', 'desc').limit(50);
    res.json({ orders: await withItems(orders) });
  } catch (err) {
    console.error('[public.myOrders]', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

exports.myOrder = async (req, res) => {
  try {
    const order = await db('orders').where({ id: req.params.id, account_id: req.account.id }).first();
    if (!order) return res.status(404).json({ error: 'Order not found', code: 'NOT_FOUND' });
    res.json({ order: (await withItems([order]))[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

// ── Notifications ─────────────────────────────────────

exports.notifications = async (req, res) => {
  try {
    const items = await db('notifications').where({ account_id: req.account.id }).orderBy('created_at', 'desc').limit(30);
    const [{ count }] = await db('notifications').where({ account_id: req.account.id }).whereNull('read_at').count({ count: '*' });
    res.json({ notifications: items, unread: Number(count) });
  } catch (err) {
    console.error('[public.notifications]', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    await db('notifications').where({ account_id: req.account.id }).whereNull('read_at').update({ read_at: db.fn.now() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

exports.normalizePhone = normalizePhone;
