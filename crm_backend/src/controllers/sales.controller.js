const db = require('../db/knex');
const { HttpError, recordSale } = require('../services/sales');

const PAYMENT_METHODS = ['cash', 'telebirr', 'cbe'];

// Cost price is for the owner only.
const stripCost = (item, role) => {
  if (role === 'owner') return item;
  const { cost_price, ...rest } = item;
  return rest;
};

exports.createSale = async (req, res) => {
  const { customer_name, customer_id, payment_method, items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty', code: 'VALIDATION_ERROR' });
  }
  if (!PAYMENT_METHODS.includes(payment_method)) {
    return res.status(400).json({ error: 'Choose a valid payment method', code: 'VALIDATION_ERROR' });
  }
  for (const item of items) {
    if (!Number.isInteger(Number(item.qty)) || Number(item.qty) < 1 ||
        !Number.isFinite(Number(item.unit_price)) || Number(item.unit_price) < 0) {
      return res.status(400).json({ error: 'Each item needs a quantity of 1 or more and a valid price', code: 'VALIDATION_ERROR' });
    }
  }

  try {
    const sale = await db.transaction(async (trx) => {
      let customer = null;
      if (customer_id) {
        customer = await trx('customers').where({ id: customer_id }).first();
        if (!customer) throw new HttpError(404, 'Customer not found');
      }
      return recordSale(trx, {
        customer, customerName: customer_name, paymentMethod: payment_method,
        items, userId: req.user.id, occurredAt: req.occurredAt,
      });
    });

    const saleItems = await db('sale_items').where({ sale_id: sale.id }).orderBy('id');
    res.status(201).json({ sale: { ...sale, items: saleItems.map(i => stripCost(i, req.user.role)) } });
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    console.error('[sales.createSale]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Last 50 sales, each with a one-line summary of what was sold.
exports.getAll = async (req, res) => {
  try {
    const query = db('sales')
      .leftJoin('sale_items', 'sales.id', 'sale_items.sale_id')
      .groupBy('sales.id')
      .select(
        'sales.*',
        db.raw("COALESCE(SUM(sale_items.qty), 0)::int AS item_count"),
        db.raw("string_agg(sale_items.product_name || ' x' || sale_items.qty, ', ' ORDER BY sale_items.id) AS summary")
      )
      .orderBy('sales.created_at', 'desc')
      .limit(50);
    // A salesperson sees the sales they made themselves; the owner sees all.
    if (req.user.role === 'sales') query.where('sales.created_by', req.user.id);
    res.json({ sales: await query });
  } catch (err) {
    console.error('[sales.getAll]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const sale = await db('sales').where({ id: req.params.id }).first();
    if (!sale || (req.user.role === 'sales' && sale.created_by !== req.user.id)) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    const items = await db('sale_items').where({ sale_id: sale.id }).orderBy('id');
    res.json({ sale: { ...sale, items: items.map(i => stripCost(i, req.user.role)) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
