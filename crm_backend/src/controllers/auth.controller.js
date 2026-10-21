const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/knex');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db('users').whereRaw('LOWER(email) = ?', [String(email).trim().toLowerCase()]).where({ is_active: true }).first();
    if (!user) return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDS' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDS' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('[auth.login]', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await db('users').select('id','name','email','role').where({ id: req.user.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
