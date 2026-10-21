const db = require('../db/knex');

// POST /api/sync/push — receive offline changes from device, save to PostgreSQL
exports.push = async (req, res) => {
  const trx = await db.transaction();
  try {
    const { changes, lastSyncedAt } = req.body;
    const mappings = { products: {}, repairs: {}, customers: {}, sales: {}, sale_items: {} };

    // --- PRODUCTS ---
    for (const p of (changes.products?.created || [])) {
      const { local_id, ...data } = p;
      const [row] = await trx('products').insert({
        name: data.name, brand: data.brand, category: data.category,
        specs: data.specs, selling_price: data.selling_price,
        cost_price: data.cost_price, stock: data.stock || 0,
        is_published: data.is_published || false, is_active: true,
        emoji: data.emoji || '📱', notes: data.notes,
      }).returning('*');
      mappings.products[local_id] = row.id;
    }
    for (const p of (changes.products?.updated || [])) {
      await trx('products').where({ id: p.server_id }).update({ ...p, updated_at: trx.fn.now() });
    }

    // --- REPAIRS ---
    for (const r of (changes.repairs?.created || [])) {
      const { local_id, ...data } = r;
      const count = await trx('repairs').count('id as c').first();
      const ticketNumber = `REP-${1000 + parseInt(count.c) + 1}`;
      const [row] = await trx('repairs').insert({
        ticket_number: ticketNumber,
        device_name: data.device_name, issue: data.issue,
        customer_name: data.customer_name, customer_phone: data.customer_phone,
        status: data.status || 'received', status_step: data.status_step || 1,
        received_at: trx.fn.now(),
      }).returning('*');
      mappings.repairs[local_id] = row.id;
    }
    for (const r of (changes.repairs?.updated || [])) {
      await trx('repairs').where({ id: r.server_id }).update({ status: r.status, status_step: r.status_step, updated_at: trx.fn.now() });
    }

    // --- CUSTOMERS ---
    for (const c of (changes.customers?.created || [])) {
      const { local_id, ...data } = c;
      const [row] = await trx('customers').insert({ name: data.name, phone: data.phone, address: data.address }).returning('*');
      mappings.customers[local_id] = row.id;
    }

    // --- SALES (offline POS) ---
    for (const s of (changes.sales?.created || [])) {
      const { local_id, items, ...data } = s;
      const [row] = await trx('sales').insert({
        customer_name: data.customer_name || 'Walk-in',
        payment_method: data.payment_method, total: data.total,
        subtotal: data.total, created_by: req.user.id,
      }).returning('*');
      mappings.sales[local_id] = row.id;
      // Insert items and adjust stock
      for (const item of (items || [])) {
        await trx('sale_items').insert({
          sale_id: row.id, product_id: mappings.products[item.product_local_id] || item.product_server_id,
          product_name: item.product_name, qty: item.qty, unit_price: item.unit_price, total: item.total,
        });
        const pid = mappings.products[item.product_local_id] || item.product_server_id;
        if (pid) await trx('products').where({ id: pid }).decrement('stock', item.qty);
      }
    }

    await trx.commit();
    res.json({ mappings, syncedAt: Date.now() });
  } catch (err) {
    await trx.rollback();
    console.error('[sync.push]', err);
    res.status(500).json({ error: 'Sync push failed' });
  }
};

// GET /api/sync/pull?since=timestamp — return all changes after timestamp
exports.pull = async (req, res) => {
  try {
    const since = req.query.since ? new Date(parseInt(req.query.since)) : new Date(0);

    const [products, repairs, customers, sales] = await Promise.all([
      db('products').where('updated_at', '>', since),
      db('repairs').where('updated_at', '>', since),
      db('customers').where('updated_at', '>', since),
      db('sales').where('created_at', '>', since),
    ]);

    res.json({
      changes: {
        products:  { created: products.filter(p => new Date(p.created_at) > since), updated: products.filter(p => new Date(p.created_at) <= since), deleted: [] },
        repairs:   { created: repairs.filter(r => new Date(r.created_at) > since),  updated: repairs.filter(r => new Date(r.created_at) <= since),  deleted: [] },
        customers: { created: customers.filter(c => new Date(c.created_at) > since),updated: customers.filter(c => new Date(c.created_at) <= since), deleted: [] },
        sales:     { created: sales, updated: [], deleted: [] },
      },
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[sync.pull]', err);
    res.status(500).json({ error: 'Sync pull failed' });
  }
};
