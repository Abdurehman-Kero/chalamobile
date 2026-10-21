const bcrypt = require('bcryptjs');
const db = require('../db/knex');
const { ROLES } = require('../config');

const PUBLIC = ['id', 'name', 'email', 'role', 'is_active', 'created_at'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.list = async (req, res) => {
  try {
    const q = db('users').select(PUBLIC).orderBy([{ column: 'is_active', order: 'desc' }, { column: 'role' }, { column: 'name' }]);
    if (req.query.role) q.where({ role: req.query.role, is_active: true });
    res.json({ users: await q });
  } catch (err) {
    console.error('[users.list]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const { password, role } = req.body;

    if (!name) return res.status(400).json({ error: 'Enter the person’s name', code: 'VALIDATION_ERROR' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address', code: 'VALIDATION_ERROR' });
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'The password must be at least 6 characters', code: 'VALIDATION_ERROR' });
    }
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Choose a role', code: 'VALIDATION_ERROR' });

    const exists = await db('users').whereRaw('LOWER(email) = ?', [email]).first();
    if (exists) return res.status(409).json({ error: 'Someone already uses this email', code: 'DUPLICATE_EMAIL' });

    const [user] = await db('users')
      .insert({ name, email, role, password: await bcrypt.hash(password, 10) })
      .returning(PUBLIC);
    res.status(201).json({ user });
  } catch (err) {
    console.error('[users.create]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Change name, role, active state, or reset the password.
exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const target = await db('users').where({ id }).first();
    if (!target) return res.status(404).json({ error: 'User not found' });

    const patch = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ error: 'Enter the person’s name', code: 'VALIDATION_ERROR' });
      patch.name = name;
    }
    if (req.body.role !== undefined) {
      if (!ROLES.includes(req.body.role)) return res.status(400).json({ error: 'Choose a role', code: 'VALIDATION_ERROR' });
      patch.role = req.body.role;
    }
    if (req.body.is_active !== undefined) patch.is_active = !!req.body.is_active;
    if (req.body.password !== undefined) {
      if (typeof req.body.password !== 'string' || req.body.password.length < 6) {
        return res.status(400).json({ error: 'The password must be at least 6 characters', code: 'VALIDATION_ERROR' });
      }
      patch.password = await bcrypt.hash(req.body.password, 10);
    }

    // The shop must never be left without an active owner, and you cannot lock yourself out.
    const losesOwner = target.role === 'owner' && target.is_active &&
      ((patch.role && patch.role !== 'owner') || patch.is_active === false);
    if (losesOwner) {
      if (id === req.user.id) {
        return res.status(400).json({ error: 'You cannot remove your own admin access', code: 'SELF_LOCKOUT' });
      }
      const [{ n }] = await db('users').where({ role: 'owner', is_active: true }).whereNot({ id }).count('id as n');
      if (Number(n) === 0) {
        return res.status(400).json({ error: 'There must be at least one active admin', code: 'LAST_OWNER' });
      }
    }
    if (id === req.user.id && patch.is_active === false) {
      return res.status(400).json({ error: 'You cannot disable your own account', code: 'SELF_LOCKOUT' });
    }

    patch.updated_at = db.fn.now();
    const [user] = await db('users').where({ id }).update(patch).returning(PUBLIC);
    res.json({ user });
  } catch (err) {
    console.error('[users.update]', err);
    res.status(500).json({ error: 'Server error' });
  }
};
