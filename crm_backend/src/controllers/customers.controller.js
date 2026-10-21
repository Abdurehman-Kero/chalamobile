const db = require('../db/knex');

const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

exports.getAll = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const query = db('customers').orderBy('name', 'asc');
    if (search) {
      query.where(function () {
        this.whereILike('name', `%${search}%`).orWhereILike('phone', `%${search}%`);
      });
    }
    const customers = await query;
    res.json({ customers });
  } catch (err) {
    console.error('[customers.getAll]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const customer = await db('customers').where({ id: req.params.id }).first();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // One row per sale (with its items summarised) instead of one row per item.
    const sales = await db('sales')
      .leftJoin('sale_items', 'sales.id', 'sale_items.sale_id')
      .where('sales.customer_id', customer.id)
      .groupBy('sales.id')
      .select(
        'sales.id', 'sales.total', 'sales.payment_method', 'sales.created_at',
        db.raw("string_agg(sale_items.product_name || ' x' || sale_items.qty, ', ' ORDER BY sale_items.id) AS summary")
      )
      .orderBy('sales.created_at', 'desc')
      .limit(10);

    // Repairs belong to the owner and technicians, not the sales desk.
    const repairs = req.user.role !== 'owner' ? [] : await db('repairs')
      .where(function () {
        this.where('customer_id', customer.id);
        if (customer.phone) this.orWhere('customer_phone', customer.phone);
        this.orWhere('customer_name', customer.name);
      })
      .select('id', 'ticket_number', 'device_name', 'status', 'received_at')
      .orderBy('received_at', 'desc')
      .limit(5);

    res.json({ customer, sales, repairs });
  } catch (err) {
    console.error('[customers.getOne]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const name = clean(req.body.name);
    if (!name) return res.status(400).json({ error: 'Customer name is required', code: 'VALIDATION_ERROR' });
    const phone = clean(req.body.phone);

    if (phone) {
      const dupe = await db('customers').where({ phone }).first();
      if (dupe) return res.status(409).json({ error: `${dupe.name} already uses this phone number`, code: 'DUPLICATE_PHONE' });
    }
    const [customer] = await db('customers').insert({ name, phone, address: clean(req.body.address) }).returning('*');
    res.status(201).json({ customer });
  } catch (err) {
    console.error('[customers.create]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const b = req.body;
    const patch = {};
    if (b.name !== undefined) {
      const name = clean(b.name);
      if (!name) return res.status(400).json({ error: 'Customer name is required', code: 'VALIDATION_ERROR' });
      patch.name = name;
    }
    if (b.phone !== undefined) {
      patch.phone = clean(b.phone);
      if (patch.phone) {
        const dupe = await db('customers').where({ phone: patch.phone }).whereNot({ id: req.params.id }).first();
        if (dupe) return res.status(409).json({ error: `${dupe.name} already uses this phone number`, code: 'DUPLICATE_PHONE' });
      }
    }
    if (b.address !== undefined) patch.address = clean(b.address);
    if (b.notes !== undefined) patch.notes = clean(b.notes);
    if (b.is_vip !== undefined) patch.is_vip = b.is_vip === true || b.is_vip === 'true';
    patch.updated_at = db.fn.now();

    const [customer] = await db('customers').where({ id: req.params.id }).update(patch).returning('*');
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (err) {
    console.error('[customers.update]', err);
    res.status(500).json({ error: 'Server error' });
  }
};
