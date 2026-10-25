const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/knex');
const { mailConfigured, sendMail } = require('../services/mail');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const signToken = (u) => jwt.sign(
  { id: u.id, email: u.email, role: u.role, name: u.name },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN },
);
const invalid = (res, error) => res.status(400).json({ error, code: 'VALIDATION_ERROR' });

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db('users').whereRaw('LOWER(email) = ?', [String(email).trim().toLowerCase()]).where({ is_active: true }).first();
    if (!user) return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDS' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDS' });

    res.json({ token: signToken(user), user: publicUser(user) });
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

// The signed-in person edits their own name, email or password. Changing the email or the
// password asks for the current password, so a phone left unlocked cannot take over the account.
exports.updateMe = async (req, res) => {
  try {
    const { name, email, password, current_password: current } = req.body;
    const user = await db('users').where({ id: req.user.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const patch = {};
    if (name !== undefined) {
      const clean = String(name).trim();
      if (!clean) return invalid(res, 'Enter your name');
      patch.name = clean;
    }
    const newEmail = email !== undefined ? String(email).trim().toLowerCase() : undefined;
    const emailChanges = newEmail !== undefined && newEmail !== user.email.toLowerCase();
    if (emailChanges) {
      if (!EMAIL_RE.test(newEmail)) return invalid(res, 'Enter a valid email address');
      const taken = await db('users').whereRaw('LOWER(email) = ?', [newEmail]).whereNot({ id: user.id }).first();
      if (taken) return res.status(409).json({ error: 'Someone already uses this email', code: 'DUPLICATE_EMAIL' });
      patch.email = newEmail;
    }
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 6) return invalid(res, 'The new password must be at least 6 characters');
      patch.password = await bcrypt.hash(password, 10);
    }

    if (patch.email || patch.password) {
      if (typeof current !== 'string' || !current) {
        return res.status(400).json({ error: 'Enter your current password to confirm', code: 'CURRENT_REQUIRED' });
      }
      if (!(await bcrypt.compare(current, user.password))) {
        return res.status(403).json({ error: 'The current password is not correct', code: 'WRONG_PASSWORD' });
      }
    }
    if (!Object.keys(patch).length) return res.json({ token: signToken(user), user: publicUser(user) });

    patch.updated_at = db.fn.now();
    const [saved] = await db('users').where({ id: user.id }).update(patch).returning('*');
    res.json({ token: signToken(saved), user: publicUser(saved) });
  } catch (err) {
    console.error('[auth.updateMe]', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

// ── Forgotten password ───────────────────────────────────────────────
// 1. The person asks for a code: it is emailed to them (valid 15 minutes, 5 tries).
// 2. They send the code with a new password.
// The owner can also use the recovery key kept on the host (OWNER_RECOVERY_KEY), for when email is not set up
// or the owner cannot reach their inbox. Staff who cannot sign in ask the owner to reset them from Team.
const CODE_MINUTES = 15;
const MAX_TRIES = 5;
const COOLDOWN_SECONDS = 60;

const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const recoveryKey = () => (process.env.OWNER_RECOVERY_KEY || '').trim();

exports.forgot = async (req, res) => {
  try {
    const email = String(req.body.email).trim().toLowerCase();
    // Only a developer who asks for it (RESET_CODE_TO_LOG=true) gets the code printed in the server log instead of emailed.
    const logOnly = !mailConfigured() && process.env.RESET_CODE_TO_LOG === 'true';
    const canMail = mailConfigured() || logOnly;
    // The answer is the same whether or not the address belongs to someone, so it cannot be used to find out who has an account.
    const answer = { method: canMail ? 'email' : 'none', recovery_key: !!recoveryKey() };
    if (!canMail) return res.json(answer);

    const user = await db('users').whereRaw('LOWER(email) = ?', [email]).where({ is_active: true }).first();
    if (!user) return res.json(answer);

    const recent = await db('password_resets').where({ user_id: user.id })
      .where('created_at', '>', new Date(Date.now() - COOLDOWN_SECONDS * 1000)).first();
    if (recent) return res.json(answer);

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await db('password_resets').where({ user_id: user.id }).whereNull('used_at').update({ used_at: db.fn.now() });
    await db('password_resets').insert({
      user_id: user.id,
      code_hash: await bcrypt.hash(code, 8),
      expires_at: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
    });

    if (mailConfigured()) {
      try {
        await sendMail({
          to: user.email,
          subject: 'Your Chala Mobile password code',
          text: `Hello ${user.name},

Your code to choose a new password is ${code}.
It works for ${CODE_MINUTES} minutes. If you did not ask for it, ignore this message; your password has not changed.

Chala Mobile`,
        });
      } catch (err) {
        // The mail service refused it (wrong key, sender not verified...). Say so, instead of pretending it was sent.
        console.error('[auth.forgot] could not send the email:', err.message);
        await db('password_resets').where({ user_id: user.id }).whereNull('used_at').del();   // so asking again is not blocked by the wait
        const sender = /sender|domain/i.test(err.message);
        return res.status(502).json({
          error: sender
            ? 'The email could not be sent: the sender address is not verified at the mail service yet. Ask the shop owner to verify it (Brevo > Senders).'
            : 'The email could not be sent. The mail service on the server is not set up correctly. Ask the shop owner to check it.',
          code: 'MAIL_FAILED',
        });
      }
    } else {
      console.log(`[auth.forgot] (development, no mail service) code for ${user.email}: ${code}`);
    }
    res.json(answer);
  } catch (err) {
    console.error('[auth.forgot]', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};

exports.reset = async (req, res) => {
  const refused = () => res.status(400).json({ error: 'That code is not right, or it has expired. Ask for a new one.', code: 'INVALID_CODE' });
  try {
    const email = String(req.body.email).trim().toLowerCase();
    const code = String(req.body.code).trim();
    const { password } = req.body;
    if (typeof password !== 'string' || password.length < 6) return invalid(res, 'The new password must be at least 6 characters');

    const user = await db('users').whereRaw('LOWER(email) = ?', [email]).where({ is_active: true }).first();
    if (!user) return refused();

    let ok = false;
    const row = await db('password_resets').where({ user_id: user.id }).whereNull('used_at')
      .where('expires_at', '>', new Date()).orderBy('created_at', 'desc').first();
    if (row && row.attempts < MAX_TRIES) {
      ok = await bcrypt.compare(code, row.code_hash);
      if (!ok) await db('password_resets').where({ id: row.id }).increment('attempts', 1);
    }
    if (!ok && user.role === 'owner' && recoveryKey() && same(code, recoveryKey())) ok = true;
    if (!ok) return refused();

    await db('users').where({ id: user.id }).update({ password: await bcrypt.hash(password, 10), updated_at: db.fn.now() });
    await db('password_resets').where({ user_id: user.id }).whereNull('used_at').update({ used_at: db.fn.now() });
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth.reset]', err);
    res.status(500).json({ error: 'Server error', code: 'SERVER_ERROR' });
  }
};
