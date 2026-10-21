const db = require('../db/knex');
const { summarize, num } = require('./finance');
const { addDays, dateString, parseDateString, startOfDay } = require('../utils/dates');

/**
 * Everything the owner wants to know about one day: what was sold, which
 * repairs were finished or handed back, and what stock was bought.
 */
async function buildDailyReport(dateStr) {
  const day = parseDateString(dateStr) || startOfDay();
  const from = startOfDay(day);
  const to = addDays(from, 1);

  const summary = await summarize(from, to);

  const saleRows = await db('sales as s')
    .leftJoin('users as u', 'u.id', 's.created_by')
    .where('s.created_at', '>=', from).where('s.created_at', '<', to)
    .select('s.id', 's.customer_name', 's.payment_method', 's.total', 's.created_at', 'u.name as sold_by')
    .orderBy('s.created_at', 'desc');
  const itemRows = saleRows.length
    ? await db('sale_items').whereIn('sale_id', saleRows.map(s => s.id)).orderBy('id')
    : [];
  const sales = saleRows.map(s => {
    const items = itemRows.filter(i => i.sale_id === s.id);
    return {
      id: s.id,
      time: s.created_at,
      customer: s.customer_name || 'Walk-in',
      sold_by: s.sold_by,
      payment_method: s.payment_method,
      total: num(s.total),
      profit: items.reduce((sum, i) => sum + (num(i.unit_price) - (i.cost_price == null ? num(i.unit_price) : num(i.cost_price))) * i.qty, 0),
      items: items.map(i => ({ name: i.product_name, qty: i.qty, unit_price: num(i.unit_price) })),
    };
  });

  const repairRows = await db('repairs as r')
    .leftJoin('users as t', 't.id', 'r.technician_id')
    .where(function () {
      this.where(function () { this.where('r.completed_at', '>=', from).where('r.completed_at', '<', to); })
        .orWhere(function () { this.where('r.delivered_at', '>=', from).where('r.delivered_at', '<', to); });
    })
    .select('r.*', 't.name as technician_name')
    .orderByRaw('COALESCE(r.delivered_at, r.completed_at) DESC');
  const inDay = (d) => d && new Date(d) >= from && new Date(d) < to;
  const repairs = repairRows.map(r => {
    const delivered = inDay(r.delivered_at);
    return {
      id: r.id,
      ticket_number: r.ticket_number,
      device_name: r.device_name,
      customer_name: r.customer_name,
      technician_name: r.technician_name,
      status: r.status,
      completed_today: !!inDay(r.completed_at),
      delivered_today: !!delivered,
      time: r.delivered_at && delivered ? r.delivered_at : r.completed_at,
      amount: delivered ? num(r.actual_cost) : null,
      profit: delivered ? num(r.actual_cost) - num(r.parts_cost) : null,
    };
  });

  const purchases = (await db('purchases as p')
    .leftJoin('users as u', 'u.id', 'p.created_by')
    .where('p.created_at', '>=', from).where('p.created_at', '<', to)
    .select('p.*', 'u.name as bought_by')
    .orderBy('p.created_at', 'desc'))
    .map(p => ({
      id: p.id, time: p.created_at, product_name: p.product_name, qty: p.qty,
      unit_cost: num(p.unit_cost), total: num(p.total), supplier: p.supplier, bought_by: p.bought_by,
    }));

  return {
    date: dateString(from),
    generated_at: new Date().toISOString(),
    summary: { ...summary, repairs_completed: repairs.filter(r => r.completed_today).length },
    sales, repairs, purchases,
  };
}

module.exports = { buildDailyReport };
