const db = require('../db/knex');
const { LOW_STOCK_AT } = require('../config');

const EMOJI_BY_CATEGORY = {
  Smartphones: '📱',
  Laptops: '💻',
  'WiFi Routers': '📶',
  Accessories: '🎧',
};
const defaultEmoji = (category, brand) =>
  brand === 'Apple' ? '🍎' : EMOJI_BY_CATEGORY[category] || '📦';

// Cost and margin are for the owner's eyes only.
const forRole = (product, role) => {
  if (role === 'owner') return product;
  const { cost_price, ...rest } = product;
  return rest;
};

const toBool = (v) => v === true || v === 'true';
const toNumberOrNull = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

// Returns an error message, or null when the payload is valid.
function validate(body, { partial }) {
  const { name, selling_price, cost_price, stock } = body;
  if (!partial || name !== undefined) {
    if (!name || !String(name).trim()) return 'Product name is required';
  }
  if (!partial || selling_price !== undefined) {
    const n = Number(selling_price);
    if (selling_price === undefined || selling_price === '' || !Number.isFinite(n) || n < 0) {
      return 'Selling price must be a valid number';
    }
  }
  if (cost_price !== undefined && cost_price !== null && cost_price !== '') {
    if (!Number.isFinite(Number(cost_price)) || Number(cost_price) < 0) return 'Cost price must be a valid number';
  }
  if (stock !== undefined && stock !== null && stock !== '') {
    if (!Number.isInteger(Number(stock)) || Number(stock) < 0) return 'Stock must be a whole number';
  }
  return null;
}

exports.getAll = async (req, res) => {
  try {
    const { search = '', category = '', brand = '', published } = req.query;
    const query = db('products').where('is_active', true);
    if (search) {
      query.where(function () {
        this.whereILike('name', `%${search}%`).orWhereILike('brand', `%${search}%`);
      });
    }
    if (category) query.where('category', category);
    if (brand) query.where('brand', brand);
    if (published !== undefined) query.where('is_published', published === 'true');
    const products = await query.orderBy('name', 'asc');

    const ids = products.map(p => p.id);
    const images = ids.length ? await db('product_images').whereIn('product_id', ids).where('is_primary', true) : [];
    const imageMap = {};
    images.forEach(img => { imageMap[img.product_id] = img.url; });
    const result = products.map(p => forRole({ ...p, primary_image: imageMap[p.id] || null }, req.user.role));
    res.json({ products: result, total: result.length, low_stock_threshold: LOW_STOCK_AT });
  } catch (err) {
    console.error('[products.getAll]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const product = await db('products').where({ id: req.params.id, is_active: true }).first();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const images = await db('product_images').where('product_id', product.id);
    res.json({ product: forRole({ ...product, images }, req.user.role) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const invalid = validate(req.body, { partial: false });
    if (invalid) return res.status(400).json({ error: invalid, code: 'VALIDATION_ERROR' });

    const { name, brand, category, specs, storage_gb, ram_gb, selling_price, cost_price, stock, notes, is_published, emoji } = req.body;
    const product = await db.transaction(async (trx) => {
    const [created] = await trx('products').insert({
      name: String(name).trim(),
      brand: brand || null,
      category: category || null,
      specs: specs || null,
      storage_gb: toNumberOrNull(storage_gb),
      ram_gb: toNumberOrNull(ram_gb),
      selling_price: Number(selling_price),
      cost_price: toNumberOrNull(cost_price),
      stock: Number(stock) || 0,
      notes: notes || null,
      is_published: toBool(is_published),
      emoji: emoji || defaultEmoji(category, brand),
    }).returning('*');
    // Opening stock is stock that was bought, so it shows in the day's purchases.
    if (created.stock > 0) {
      const unit = Number(created.cost_price) || 0;
      await trx('purchases').insert({
        product_id: created.id, product_name: created.name, qty: created.stock,
        unit_cost: unit, total: unit * created.stock, created_by: req.user.id,
        created_at: req.occurredAt,
      });
    }
    return created;
    });
    res.status(201).json({ product });
  } catch (err) {
    console.error('[products.create]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Partial update: only the fields present in the body are changed.
exports.update = async (req, res) => {
  try {
    const invalid = validate(req.body, { partial: true });
    if (invalid) return res.status(400).json({ error: invalid, code: 'VALIDATION_ERROR' });

    const b = req.body;
    const patch = {};
    if (b.name !== undefined) patch.name = String(b.name).trim();
    if (b.brand !== undefined) patch.brand = b.brand || null;
    if (b.category !== undefined) patch.category = b.category || null;
    if (b.specs !== undefined) patch.specs = b.specs || null;
    if (b.storage_gb !== undefined) patch.storage_gb = toNumberOrNull(b.storage_gb);
    if (b.ram_gb !== undefined) patch.ram_gb = toNumberOrNull(b.ram_gb);
    if (b.selling_price !== undefined) patch.selling_price = Number(b.selling_price);
    if (b.cost_price !== undefined) patch.cost_price = toNumberOrNull(b.cost_price);
    if (b.stock !== undefined && b.stock !== '') patch.stock = Number(b.stock);
    if (b.notes !== undefined) patch.notes = b.notes || null;
    if (b.is_published !== undefined) patch.is_published = toBool(b.is_published);
    if (b.emoji) patch.emoji = b.emoji;
    patch.updated_at = db.fn.now();

    const [product] = await db('products').where({ id: req.params.id, is_active: true }).update(patch).returning('*');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) {
    console.error('[products.update]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    const count = await db('products').where({ id: req.params.id, is_active: true })
      .update({ is_active: false, updated_at: db.fn.now() });
    if (!count) return res.status(404).json({ error: 'Product not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });
    const url = `/uploads/${req.file.filename}`;
    const existing = await db('product_images').where({ product_id: req.params.id, is_primary: true }).first();
    await db('product_images').insert({
      product_id: req.params.id,
      url,
      is_primary: !existing,
    });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Add stock that was just bought. Recorded as a purchase so it appears in the
// daily report, and the product's cost price follows the latest purchase.
exports.restock = async (req, res) => {
  try {
    const qty = Number(req.body.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ error: 'Enter how many were bought (1 or more)', code: 'VALIDATION_ERROR' });
    }
    const unitCostRaw = req.body.unit_cost;
    if (unitCostRaw !== undefined && unitCostRaw !== null && unitCostRaw !== '' &&
        (!Number.isFinite(Number(unitCostRaw)) || Number(unitCostRaw) < 0)) {
      return res.status(400).json({ error: 'Cost must be a valid number', code: 'VALIDATION_ERROR' });
    }

    const result = await db.transaction(async (trx) => {
      const product = await trx('products').where({ id: req.params.id, is_active: true }).forUpdate().first();
      if (!product) return null;
      const hasCost = unitCostRaw !== undefined && unitCostRaw !== null && unitCostRaw !== '';
      const unit = hasCost ? Number(unitCostRaw) : Number(product.cost_price) || 0;
      const patch = { stock: product.stock + qty, updated_at: trx.fn.now() };
      if (hasCost) patch.cost_price = unit;
      const [updated] = await trx('products').where({ id: product.id }).update(patch).returning('*');
      const [purchase] = await trx('purchases').insert({
        product_id: product.id, product_name: product.name, qty, unit_cost: unit, total: unit * qty,
        supplier: (req.body.supplier || '').trim() || null, created_by: req.user.id,
        created_at: req.occurredAt,
      }).returning('*');
      return { product: updated, purchase };
    });
    if (!result) return res.status(404).json({ error: 'Product not found' });
    res.status(201).json(result);
  } catch (err) {
    console.error('[products.restock]', err);
    res.status(500).json({ error: 'Server error' });
  }
};
