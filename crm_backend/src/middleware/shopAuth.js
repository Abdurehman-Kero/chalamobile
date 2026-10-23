const jwt = require('jsonwebtoken');
const db = require('../db/knex');

// Web-store customers sign in with their own kind of token, signed with a different
// secret from the staff one. A customer token therefore fails the staff check and
// can never be mistaken for a staff account that happens to share the same id.
const shopSecret = () => `${process.env.JWT_SECRET}:shop`;

const signShopToken = (account) =>
  jwt.sign({ id: account.id, kind: 'shop' }, shopSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });

async function requireShopAccount(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please sign in to continue', code: 'NO_TOKEN' });
  }
  let decoded;
  try {
    decoded = jwt.verify(header.split(' ')[1], shopSecret());
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again', code: 'INVALID_TOKEN' });
  }
  if (decoded.kind !== 'shop') return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  try {
    const account = await db('shop_accounts').select('id', 'name', 'phone', 'email').where({ id: decoded.id }).first();
    if (!account) return res.status(401).json({ error: 'Account not found', code: 'INVALID_TOKEN' });
    req.account = account;
    next();
  } catch (err) {
    console.error('[shopAuth]', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
}

module.exports = { signShopToken, requireShopAccount };
