const db = require('../db/knex');
const { LOW_STOCK_AT } = require('../config');
const { startOfDay, addDays, dateString, daysBetween } = require('../utils/dates');
const { summarize, dailyRevenue } = require('../services/finance');

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const count = async (q) => Number((await q.count('id as n').first()).n);

// What each role sees on Home:
//  owner      the whole business, including profit
//  sales      their own sales today (no cost or profit figures)
//  technician their own repair workload
exports.getMetrics = async (req, res) => {
  try {
    const { role, id } = req.user;
    const today = startOfDay();
    const tomorrow = addDays(today, 1);

    if (role === 'technician') {
      const mine = () => db('repairs').where(function () { this.where('technician_id', id).orWhereNull('technician_id'); });
      const open = await mine().whereIn('status', ['received', 'diagnosing', 'fixing']).select('promised_date');
      const todayStr = dateString();
      const [doneToday] = await db('repairs').where({ technician_id: id })
        .where('completed_at', '>=', today).where('completed_at', '<', tomorrow).count('id as n');
      return res.json({
        role,
        activeRepairs: open.length,
        dueSoonCount: open.filter(r => r.promised_date && daysBetween(todayStr, r.promised_date) <= 1).length,
        readyRepairs: await count(db('repairs').where({ technician_id: id, status: 'completed' })),
        completedToday: Number(doneToday.n),
      });
    }

    const [s, lowStockCount] = await Promise.all([
      summarize(today, tomorrow, { salesBy: role === 'sales' ? id : undefined }),
      count(db('products').where('is_active', true).where('stock', '<=', LOW_STOCK_AT)),
    ]);

    if (role === 'sales') {
      return res.json({
        role,
        todayRevenue: s.sales_revenue,
        salesCount: s.sales_count,
        unitsSold: s.units_sold,
        lowStockCount,
        totalCustomers: await count(db('customers')),
      });
    }

    const [week, activeRepairs, readyRepairs, totalCustomers] = await Promise.all([
      summarize(addDays(today, -6), tomorrow),
      count(db('repairs').whereIn('status', ['received', 'diagnosing', 'fixing'])),
      count(db('repairs').where('status', 'completed')),
      count(db('customers')),
    ]);
    res.json({
      role,
      todayRevenue: s.total_revenue,
      salesRevenue: s.sales_revenue,
      repairRevenue: s.repair_revenue,
      todayProfit: s.total_profit,
      weekProfit: week.total_profit,
      unitsSold: s.units_sold,
      salesCount: s.sales_count,
      purchasesToday: s.purchases_total,
      activeRepairs,
      readyRepairs,
      totalCustomers,
      lowStockCount,
    });
  } catch (err) {
    console.error('[dashboard.getMetrics]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Daily revenue for the last 7 days (oldest first), labelled with the real
// weekday, plus the change against the 7 days before that.
exports.getWeekly = async (req, res) => {
  try {
    const salesBy = req.user.role === 'sales' ? req.user.id : undefined;
    const { start, perDay } = await dailyRevenue(14, { salesBy });

    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(startOfDay(), -i);
      labels.push(i === 0 ? 'Today' : DAY_NAMES[d.getDay()]);
    }
    const values = perDay.slice(7);
    const thisWeek = values.reduce((a, b) => a + b, 0);
    const lastWeek = perDay.slice(0, 7).reduce((a, b) => a + b, 0);
    const changePct = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

    res.json({ labels, values, total: thisWeek, changePct, from: dateString(addDays(start, 7)) });
  } catch (err) {
    console.error('[dashboard.getWeekly]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getActivity = async (req, res) => {
  try {
    const { role, id } = req.user;
    const salesQ = db('sales')
      .leftJoin('sale_items', 'sales.id', 'sale_items.sale_id')
      .groupBy('sales.id')
      .select(
        'sales.id', 'sales.total', 'sales.payment_method', 'sales.created_at', 'sales.customer_name',
        db.raw('COALESCE(SUM(sale_items.qty), 0)::int AS item_count'),
        db.raw("string_agg(sale_items.product_name, ', ' ORDER BY sale_items.id) AS summary")
      )
      .orderBy('sales.created_at', 'desc').limit(5);
    if (role === 'sales') salesQ.where('sales.created_by', id);
    const recentSales = role === 'technician' ? [] : await salesQ;

    const repairsQ = db('repairs')
      .whereIn('status', ['completed', 'delivered'])
      .select('id', 'ticket_number', 'device_name', 'status', 'updated_at')
      .orderBy('updated_at', 'desc').limit(3);
    if (role === 'technician') repairsQ.where({ technician_id: id });
    const recentRepairs = role === 'sales' ? [] : await repairsQ;

    const items = [
      ...recentSales.map(s => ({
        type: 'sale', id: s.id,
        description: s.summary || 'Sale',
        customer: s.customer_name,
        item_count: s.item_count,
        amount: parseFloat(s.total), method: s.payment_method,
        time: new Date(s.created_at).toISOString(),
      })),
      ...recentRepairs.map(r => ({
        type: 'repair', id: r.id,
        description: r.device_name, ticket: r.ticket_number,
        status: r.status, time: new Date(r.updated_at).toISOString(),
      })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({ items });
  } catch (err) {
    console.error('[dashboard.getActivity]', err);
    res.status(500).json({ error: 'Server error' });
  }
};
