const db = require('../db/knex');
const { HttpError, recordSale } = require('../services/sales');

// Online orders as the shop sees them. Customers place them on the web store
// (public.controller.js); the shop confirms, prepares and hands them over here.

const STATUSES = ['pending', 'confirmed', 'ready', 'delivered', 'cancelled'];
// Cancelling is only possible before the shop confirms: confirming records the sale
// and takes the stock, which this flow does not hand back.
const NEXT = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['ready', 'delivered'],
  ready:     ['delivered'],
  delivered: [],
  cancelled: [],
};

const messageFor = (order, status) => {
  const n = order.order_number;
  switch (status) {
    case 'confirmed': return ['Order confirmed', `Order ${n} is confirmed. We are preparing it for you.`];
    case 'ready':     return order.delivery_method === 'pickup'
      ? ['Ready for pickup', `Order ${n} is ready. Come to the shop to collect it.`]
      : ['On its way', `Order ${n} is ready and will be delivered to you shortly.`];
    case 'delivered': return ['Order completed', `Order ${n} is complete. Thank you for shopping with Chala Mobile!`];
    case 'cancelled': return ['Order cancelled', `Order ${n} was cancelled. Call us if you have any questions.`];
    default:          return null;
  }
};

const attachItems = async (orders) => {
  if (!orders.length) return [];
  const items = await db('order_items').whereIn('order_id', orders.map(o => o.id)).orderBy('id');
  return orders.map(o => ({
    ...o,
    total: Number(o.total),
    items: items.filter(i => i.order_id === o.id).map(i => ({
      id: i.id, product_id: i.product_id, name: i.product_name, qty: i.qty, unit_price: Number(i.unit_price),
    })),
  }));
};

exports.list = async (req, res) => {
  try {
    const { status } = req.query;
    const query = db('orders').orderBy('created_at', 'desc').limit(100);
    if (STATUSES.includes(status)) query.where({ status });
    const orders = await attachItems(await query);
    const [{ count }] = await db('orders').where({ status: 'pending' }).count({ count: '*' });
    res.json({ orders, pending: Number(count) });
  } catch (err) {
    console.error('[orders.list]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: (await attachItems([order]))[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Finds the shop's customer record by phone (matching on the last 9 digits, so
// 0911... and +251911... are the same person), or creates one.
async function customerFor(trx, order) {
  const tail = String(order.phone).replace(/\D/g, '').slice(-9);
  const found = await trx('customers')
    .whereRaw("RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '\\D', '', 'g'), 9) = ?", [tail]).first();
  if (found) return found;
  const [created] = await trx('customers').insert({
    name: order.customer_name, phone: order.phone, address: order.address || null,
  }).returning('*');
  return created;
}

exports.setStatus = async (req, res) => {
  const status = req.body.status;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Choose a valid status', code: 'VALIDATION_ERROR' });

  try {
    const order = await db.transaction(async (trx) => {
      const current = await trx('orders').where({ id: req.params.id }).forUpdate().first();
      if (!current) throw new HttpError(404, 'Order not found');
      if (!NEXT[current.status].includes(status)) {
        throw new HttpError(400, `An order that is ${current.status} cannot be changed to ${status}`);
      }

      const patch = { status, updated_at: trx.fn.now() };
      if (status === 'confirmed') {
        // Confirming turns the order into a normal sale: stock goes down and it counts in the reports.
        const items = await trx('order_items').where({ order_id: current.id });
        const customer = await customerFor(trx, current);
        const sale = await recordSale(trx, {
          customer,
          paymentMethod: current.payment_method,
          items: items.map(i => ({ product_id: i.product_id, qty: i.qty, unit_price: i.unit_price })),
          userId: req.user.id,
          occurredAt: new Date(),
        });
        patch.sale_id = sale.id;
      }

      const [updated] = await trx('orders').where({ id: current.id }).update(patch).returning('*');
      const message = messageFor(updated, status);
      if (message && updated.account_id) {
        await trx('notifications').insert({
          account_id: updated.account_id, order_id: updated.id, title: message[0], body: message[1],
        });
      }
      return updated;
    });
    res.json({ order: (await attachItems([order]))[0] });
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    console.error('[orders.setStatus]', err);
    res.status(500).json({ error: 'Server error' });
  }
};
