const db = require('../db/knex');
const { LOW_STOCK_AT, REMIND_DAYS_BEFORE } = require('../config');
const { dateString, daysBetween } = require('../utils/dates');

// Things that need attention right now, worked out fresh on every request:
//  - low stock         (owner, sales)
//  - repairs due soon  (owner: all repairs, technician: their own)
// "Ignore" and "snooze" are handled on the phone; the server only reports facts.
exports.list = async (req, res) => {
  try {
    const { role, id } = req.user;
    const alerts = [];

    if (role === 'owner' || role === 'sales') {
      const low = await db('products').where('is_active', true).where('stock', '<=', LOW_STOCK_AT)
        .select('id', 'name', 'stock', 'emoji').orderBy('stock', 'asc');
      low.forEach(p => alerts.push({
        key: `low:${p.id}:${p.stock}`,   // restocking changes the key, so a fresh alert can fire later
        type: 'low_stock',
        severity: p.stock <= 0 ? 'danger' : 'warning',
        title: p.name,
        detail: p.stock <= 0 ? 'Out of stock' : `Only ${p.stock} left`,
        product_id: p.id,
        stock: p.stock,
        emoji: p.emoji,
      }));
    }

    if (role === 'owner' || role === 'technician') {
      const q = db('repairs').whereIn('status', ['received', 'diagnosing', 'fixing']).whereNotNull('promised_date')
        .select('id', 'ticket_number', 'device_name', 'customer_name', 'customer_phone', 'promised_date', 'technician_id');
      if (role === 'technician') q.where({ technician_id: id });
      const today = dateString();
      (await q).forEach(r => {
        const left = daysBetween(today, r.promised_date);
        if (left > REMIND_DAYS_BEFORE) return;
        alerts.push({
          key: `due:${r.id}:${r.promised_date}`,   // moving the promised day makes a new alert
          type: 'repair_due',
          severity: left < 0 ? 'danger' : 'warning',
          title: r.device_name,
          detail: left < 0 ? `Overdue by ${-left} ${-left === 1 ? 'day' : 'days'}` : left === 0 ? 'Due today' : 'Due tomorrow',
          repair_id: r.id,
          ticket_number: r.ticket_number,
          customer_name: r.customer_name,
          customer_phone: r.customer_phone,
          days_until_due: left,
        });
      });
    }

    // Most urgent first: overdue, then due today, then due tomorrow, then stock.
    alerts.sort((a, b) =>
      (a.type === 'repair_due' ? a.days_until_due : 99) - (b.type === 'repair_due' ? b.days_until_due : 99));
    res.json({ alerts });
  } catch (err) {
    console.error('[alerts.list]', err);
    res.status(500).json({ error: 'Server error' });
  }
};
