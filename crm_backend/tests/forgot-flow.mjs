// Forgotten password: emailed code (development prints it to the server log) and the owner's recovery key.
// Needs a running server on port 3055, started with OWNER_RECOVERY_KEY=test-recovery-key-123 and its output
// saved to the file given as the first argument, on a freshly seeded database:  node tests/forgot-flow.mjs /tmp/be.log
import fs from 'node:fs';
const LOG = process.argv[2];
const B = 'http://localhost:3055/api';
const j = async (p, o = {}) => { const r = await fetch(B + p, { ...o, headers: { 'content-type': 'application/json' }, body: o.body ? JSON.stringify(o.body) : undefined }); let b = null; try { b = await r.json(); } catch {} return { s: r.status, b }; };
const ok = (n, c, x) => console.log(c ? 'PASS' : 'FAIL', n, c ? '' : JSON.stringify(x));
const post = (p, body) => j(p, { method: 'POST', body });
const codeFor = (email) => { const text = fs.readFileSync(LOG, 'utf8'); const found = []; let at = 0; const tag = `code for ${email}: `; while ((at = text.indexOf(tag, at)) !== -1) { found.push(text.slice(at + tag.length, at + tag.length + 6)); at += tag.length; } return found.at(-1); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const codeAfter = async (email) => { await wait(400); return codeFor(email); };

let r = await post('/auth/forgot', { email: 'tech@chalamobile.com' });
ok('forgot answers', r.s === 200 && r.b.method === 'email', r);
r = await post('/auth/forgot', { email: 'nobody@nowhere.com' });
ok('unknown email gets the same answer', r.s === 200 && r.b.method === 'email', r);
const code = await codeAfter('tech@chalamobile.com');
ok('a 6-digit code was made for the real account only', /^\d{6}$/.test(code) && !(await codeAfter('nobody@nowhere.com')), code);

r = await post('/auth/reset', { email: 'tech@chalamobile.com', code: '000000', password: 'newtech1' });
ok('wrong code refused', r.s === 400 && r.b.code === 'INVALID_CODE', r);
r = await post('/auth/reset', { email: 'tech@chalamobile.com', code, password: 'abc' });
ok('short password refused', r.s === 400, r);
r = await post('/auth/reset', { email: 'tech@chalamobile.com', code, password: 'newtech1' });
ok('right code changes the password', r.s === 200, r);
ok('new password signs in', (await post('/auth/login', { email: 'tech@chalamobile.com', password: 'newtech1' })).s === 200);
ok('old password does not', (await post('/auth/login', { email: 'tech@chalamobile.com', password: 'tech123' })).s === 401);
r = await post('/auth/reset', { email: 'tech@chalamobile.com', code, password: 'again123' });
ok('a code works only once', r.s === 400, r);

// too many wrong guesses lock the code
await wait(1100);
await post('/auth/forgot', { email: 'sales@chalamobile.com' });
const c2 = await codeAfter('sales@chalamobile.com');
for (let i = 0; i < 5; i++) await post('/auth/reset', { email: 'sales@chalamobile.com', code: '111111', password: 'whatever1' });
r = await post('/auth/reset', { email: 'sales@chalamobile.com', code: c2, password: 'whatever1' });
ok('code is locked after 5 wrong tries', r.s === 400, r);

// the owner's recovery key
r = await post('/auth/reset', { email: 'tech@chalamobile.com', code: 'test-recovery-key-123', password: 'hack1234' });
ok('recovery key does not work for staff', r.s === 400, r);
r = await post('/auth/reset', { email: 'admin@chalamobile.com', code: 'wrong-key', password: 'ownerpw1' });
ok('wrong recovery key refused', r.s === 400, r);
r = await post('/auth/reset', { email: 'admin@chalamobile.com', code: 'test-recovery-key-123', password: 'ownerpw1' });
ok('owner can reset with the recovery key', r.s === 200, r);
ok('owner signs in with it', (await post('/auth/login', { email: 'admin@chalamobile.com', password: 'ownerpw1' })).s === 200);
