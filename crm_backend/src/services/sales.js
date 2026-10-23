// Records a sale inside the caller's transaction. Shared by the till (POS) and by
// confirming an online order, so stock and customer totals are handled one way.

// A failed check inside a transaction is thrown as an HttpError so the transaction
// rolls back exactly once and the client gets a clear message.
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function recordSale(trx, { customer, customerName, paymentMethod, items, userId, occurredAt }) {
  const total = items.reduce((sum, i) => sum + Number(i.unit_price) * Number(i.qty), 0);

  const [created] = await trx('sales').insert({
    customer_id: customer ? customer.id : null,
    customer_name: customer ? customer.name : (customerName || 'Walk-in'),
    payment_method: paymentMethod,
    subtotal: total,
    total,
    created_by: userId,
    created_at: occurredAt,   // when the sale really happened (may be earlier, if made offline)
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
}

module.exports = { HttpError, recordSale };
