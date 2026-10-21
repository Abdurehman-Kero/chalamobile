const db = require('../db/knex');

const PAYMENT_METHODS = ['cash', 'telebirr', 'cbe'];

// Cost price is for the owner only.
const stripCost = (item, role) => {
  if (role === 'owner') return item;
  const { cost_price, ...rest } = item;
  return rest;
};

// A failed check inside the transaction is thrown as an HttpError so the
// transaction rolls back exactly once and the client gets a clear message.
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

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
      const total = items.reduce((sum, i) => sum + Number(i.unit_price) * Number(i.qty), 0);

      let customer = null;
      if (customer_id) {
        customer = await trx('customers').where({ id: customer_id }).first();
        if (!customer) throw new HttpError(404, 'Customer not found');
      }

      const [created] = await trx('sales').insert({
        customer_id: customer ? customer.id : null,
        customer_name: customer ? customer.name : (customer_name || 'Walk-in'),
        payment_method,
        subtotal: total,
        total,
        created_by: req.user.id,
        created_at: req.occurredAt,   // when the sale really happened (may be earlier, if made offline)
      }).returning('*');

      for (const item of items) {
        // Lock the row so two simultaneous sales cannot oversell the same stock.
        const product = await trx('products').where({ id: item.product_id, is_active: true }).forUpdate().first();
        if (!product) throw new HttpError(404, `Product ${item.product_id} not found`);
        if (product.stock < item.qty) {
          throw new HttpError(400, `Only ${product.stock} left in stock for ${product.name}`);
        }
        await trx('sale_items').insert({
          sale_id: created.id,
          product_id: product.id,
          product_name: product.name,
          qty: item.qty,
          unit_price: item.unit_price,
          // Freeze today's cost so profit stays right if the cost price changes later.
          cost_price: product.cost_price,
          total: Number(item.unit_price) * Number(item.qty),
        });
        await trx('products').where({ id: product.id }).decrement('stock', item.qty);
      }

      if (customer) {
        await trx('customers').where({ id: customer.id }).update({
          total_spent: trx.raw('COALESCE(total_spent, 0) + ?', [total]),
          buy_count: trx.raw('COALESCE(buy_count, 0) + 1'),
          updated_at: trx.fn.now(),
        });
      }
      return created;
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
