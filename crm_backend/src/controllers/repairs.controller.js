const db = require('../db/knex');
const { OVERDUE_AFTER_DAYS } = require('../config');
const { dateString, parseDateString, daysBetween } = require('../utils/dates');

const STATUS_STAGES = ['received', 'diagnosing', 'fixing', 'completed', 'delivered'];

const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const isBlank = (v) => v === undefined || v === null || v === '';
const isMoney = (v) => Number.isFinite(Number(v)) && Number(v) >= 0;

// Repairs joined with the technician's name.
const base = () => db('repairs as r')
  .leftJoin('users as t', 't.id', 'r.technician_id')
  .select('r.*', 't.name as technician_name');

// A technician works with the jobs assigned to them plus the unassigned queue;
// the owner sees everything.
const scoped = (query, user) => {
  if (user.role === 'technician') {
    query.where(function () { this.where('r.technician_id', user.id).orWhereNull('r.technician_id'); });
  }
  return query;
};

// Computed fields. A repair with a promised date is overdue once that day has
// passed; without one it falls back to a fixed number of days in the shop.
function withDerived(t) {
  const today = dateString();
  const days = Math.floor((Date.now() - new Date(t.received_at).getTime()) / 86400000);
  const open = t.status !== 'completed' && t.status !== 'delivered';
  const untilDue = t.promised_date ? daysBetween(today, t.promised_date) : null;
  const overdue = open && (untilDue !== null ? untilDue < 0 : days > OVERDUE_AFTER_DAYS);
  return { ...t, days_in_shop: days, days_until_due: untilDue, is_overdue: overdue };
}

const findOne = (id, user) => scoped(base().where('r.id', id), user).first();

exports.getAll = async (req, res) => {
  try {
    const query = base().orderBy('r.received_at', 'desc');
    if (req.query.status) query.where('r.status', req.query.status);
    const tickets = (await scoped(query, req.user)).map(withDerived);
    res.json({ tickets });
  } catch (err) {
    console.error('[repairs.getAll]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const ticket = await findOne(req.params.id, req.user);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ ticket: withDerived(ticket) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const device_name = clean(req.body.device_name);
    const issue = clean(req.body.issue);
    if (!device_name || !issue) {
      return res.status(400).json({ error: 'Device name and issue are required', code: 'VALIDATION_ERROR' });
    }
    const cost = req.body.estimated_cost;
    if (!isBlank(cost) && !isMoney(cost)) {
      return res.status(400).json({ error: 'Estimated cost must be a valid number', code: 'VALIDATION_ERROR' });
    }
    // The received date is "now"; only the promised date is entered by the user.
    const promised = parseDateString(req.body.promised_date);
    if (!promised) {
      return res.status(400).json({ error: 'Choose the day you promised to return the device', code: 'VALIDATION_ERROR' });
    }
    if (req.body.promised_date < dateString(req.occurredAt)) {
      return res.status(400).json({ error: 'The promised day cannot be in the past', code: 'VALIDATION_ERROR' });
    }

    // Next ticket = highest existing REP- number + 1. The advisory lock stops two
    // tickets created at the same moment from picking the same number.
    const id = await db.transaction(async (trx) => {
      await trx.raw('SELECT pg_advisory_xact_lock(7001)');
      const { rows } = await trx.raw(
        "SELECT COALESCE(MAX(substring(ticket_number from 5)::int), 1000) AS n FROM repairs WHERE ticket_number ~ '^REP-[0-9]+$'"
      );
      const [row] = await trx('repairs').insert({
        ticket_number: `REP-${rows[0].n + 1}`,
        device_name, issue,
        customer_name: clean(req.body.customer_name),
        customer_phone: clean(req.body.customer_phone),
        estimated_cost: isBlank(cost) ? null : Number(cost),
        promised_date: req.body.promised_date,
        // A technician who registers a job takes it on themselves.
        technician_id: req.user.role === 'technician' ? req.user.id : null,
        status: 'received',
        status_step: 1,
        received_at: req.occurredAt,
      }).returning('id');
      return row.id;
    });
    res.status(201).json({ ticket: withDerived(await findOne(id, req.user)) });
  } catch (err) {
    console.error('[repairs.create]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.advanceStatus = async (req, res) => {
  try {
    const ticket = await findOne(req.params.id, req.user);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const currentIdx = STATUS_STAGES.indexOf(ticket.status);
    if (currentIdx >= STATUS_STAGES.length - 1) {
      return res.status(400).json({ error: 'Ticket is already delivered' });
    }
    const newStatus = STATUS_STAGES[currentIdx + 1];
    const update = { status: newStatus, status_step: currentIdx + 2, updated_at: db.fn.now() };

    // Whoever picks up an unassigned job from the queue owns it from then on.
    if (req.user.role === 'technician' && !ticket.technician_id) update.technician_id = req.user.id;

    if (newStatus === 'completed') update.completed_at = req.occurredAt;
    if (newStatus === 'delivered') {
      // Handing the device back is when the money is collected.
      const amount = isBlank(req.body.amount_collected) ? ticket.estimated_cost : req.body.amount_collected;
      if (isBlank(amount) || !isMoney(amount)) {
        return res.status(400).json({ error: 'Enter the amount collected from the customer', code: 'VALIDATION_ERROR' });
      }
      if (!isBlank(req.body.parts_cost) && !isMoney(req.body.parts_cost)) {
        return res.status(400).json({ error: 'Parts cost must be a valid number', code: 'VALIDATION_ERROR' });
      }
      update.delivered_at = req.occurredAt;
      update.actual_cost = Number(amount);
      update.parts_cost = isBlank(req.body.parts_cost) ? null : Number(req.body.parts_cost);
    }
    await db('repairs').where({ id: ticket.id }).update(update);
    res.json({ ticket: withDerived(await findOne(ticket.id, req.user)) });
  } catch (err) {
    console.error('[repairs.advanceStatus]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Reschedule the promised day or correct the estimate.
exports.update = async (req, res) => {
  try {
    const ticket = await findOne(req.params.id, req.user);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const patch = {};
    if (req.body.promised_date !== undefined) {
      if (!parseDateString(req.body.promised_date)) {
        return res.status(400).json({ error: 'Choose a valid promised day', code: 'VALIDATION_ERROR' });
      }
      patch.promised_date = req.body.promised_date;
    }
    if (req.body.estimated_cost !== undefined) {
      if (!isBlank(req.body.estimated_cost) && !isMoney(req.body.estimated_cost)) {
        return res.status(400).json({ error: 'Estimated cost must be a valid number', code: 'VALIDATION_ERROR' });
      }
      patch.estimated_cost = isBlank(req.body.estimated_cost) ? null : Number(req.body.estimated_cost);
    }
    patch.updated_at = db.fn.now();
    await db('repairs').where({ id: ticket.id }).update(patch);
    res.json({ ticket: withDerived(await findOne(ticket.id, req.user)) });
  } catch (err) {
    console.error('[repairs.update]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Owner assigns a ticket to a technician (or clears it back to the queue).
exports.assign = async (req, res) => {
  try {
    const ticket = await db('repairs').where({ id: req.params.id }).first();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const techId = req.body.technician_id ?? null;
    if (techId !== null) {
      const tech = await db('users').where({ id: techId, role: 'technician', is_active: true }).first();
      if (!tech) return res.status(400).json({ error: 'Choose an active technician', code: 'VALIDATION_ERROR' });
    }
    await db('repairs').where({ id: ticket.id }).update({ technician_id: techId, updated_at: db.fn.now() });
    res.json({ ticket: withDerived(await findOne(ticket.id, req.user)) });
  } catch (err) {
    console.error('[repairs.assign]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.withDerived = withDerived;
