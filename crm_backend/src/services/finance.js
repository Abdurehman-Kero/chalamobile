const db = require('../db/knex');
const { startOfDay, addDays } = require('../utils/dates');

const num = (v) => parseFloat(v) || 0;

/**
 * Revenue and profit for [from, to).
 *  - Sales revenue is counted when the sale is made; profit is price minus the
 *    cost frozen on each sale line (a line with no known cost counts as zero profit).
 *  - Repair revenue is counted when the device is handed back and paid for;
 *    repair profit is the amount collected minus the parts cost.
 * Pass `salesBy` to limit sales to one salesperson.
 */
async function summarize(from, to, { salesBy } = {}) {
  const salesQ = db('sales as s').where('s.created_at', '>=', from).where('s.created_at', '<', to);
  const itemsQ = db('sale_items as si').join('sales as s', 's.id', 'si.sale_id')
    .where('s.created_at', '>=', from).where('s.created_at', '<', to);
  if (salesBy) { salesQ.where('s.created_by', salesBy); itemsQ.where('s.created_by', salesBy); }

  const [sales] = await salesQ.select(db.raw('COALESCE(SUM(s.total), 0) AS revenue'), db.raw('COUNT(*) AS n'));
  const [items] = await itemsQ.select(
    db.raw('COALESCE(SUM(si.qty), 0) AS units'),
    db.raw('COALESCE(SUM((si.unit_price - COALESCE(si.cost_price, si.unit_price)) * si.qty), 0) AS profit'),
  );
  const [repairs] = await db('repairs')
    .where('delivered_at', '>=', from).where('delivered_at', '<', to)
    .select(
      db.raw('COALESCE(SUM(actual_cost), 0) AS revenue'),
      db.raw('COALESCE(SUM(actual_cost - COALESCE(parts_cost, 0)), 0) AS profit'),
      db.raw('COUNT(*) AS n'),
    );
  const [bought] = await db('purchases').where('created_at', '>=', from).where('created_at', '<', to)
    .select(db.raw('COALESCE(SUM(total), 0) AS total'), db.raw('COUNT(*) AS n'));

  const salesRevenue = num(sales.revenue);
  const repairRevenue = num(repairs.revenue);
  const salesProfit = num(items.profit);
  const repairProfit = num(repairs.profit);
  return {
    sales_revenue: salesRevenue,
    repair_revenue: repairRevenue,
    total_revenue: salesRevenue + repairRevenue,
    sales_profit: salesProfit,
    repair_profit: repairProfit,
    total_profit: salesProfit + repairProfit,
    purchases_total: num(bought.total),
    purchases_count: Number(bought.n),
    sales_count: Number(sales.n),
    units_sold: Number(items.units),
    repairs_delivered: Number(repairs.n),
  };
}

// Revenue per day for the last `days` days, oldest first (sales + repairs handed back).
async function dailyRevenue(days, { salesBy } = {}) {
  const today = startOfDay();
  const start = addDays(today, -(days - 1));
  const end = addDays(today, 1);

  const salesQ = db('sales').where('created_at', '>=', start).where('created_at', '<', end).select('total', 'created_at');
  if (salesBy) salesQ.where('created_by', salesBy);
  const sales = await salesQ;
  const repairs = salesBy ? [] : await db('repairs')
    .where('delivered_at', '>=', start).where('delivered_at', '<', end).select('actual_cost', 'delivered_at');

  const perDay = new Array(days).fill(0);
  const put = (when, amount) => {
    const i = Math.round((startOfDay(new Date(when)) - start) / 86400000);
    if (i >= 0 && i < days) perDay[i] += num(amount);
  };
  sales.forEach(s => put(s.created_at, s.total));
  repairs.forEach(r => put(r.delivered_at, r.actual_cost));
  return { start, perDay };
}

module.exports = { summarize, dailyRevenue, num };
