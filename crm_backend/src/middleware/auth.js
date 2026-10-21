const jwt = require('jsonwebtoken');
const db = require('../db/knex');

// Verifies the token, then loads the user fresh from the database. That way a
// deactivated account, or a changed role, takes effect on the very next request
// instead of waiting for the token to expire.
module.exports = async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
  }
  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
  const user = await db('users').select('id', 'name', 'email', 'role', 'is_active').where({ id: decoded.id }).first();
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'This account has been disabled', code: 'ACCOUNT_DISABLED' });
  }
  req.user = user;
  next();
};
