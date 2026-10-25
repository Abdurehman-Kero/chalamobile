// Sends a plain-text email through an HTTPS mail service. The free host blocks ordinary mail ports,
// so this uses a service's web API. Set ONE of these on the host:
//   BREVO_API_KEY   (brevo.com, free 300 a day; MAIL_FROM must be a sender verified there)
//   RESEND_API_KEY  (resend.com; MAIL_FROM must be on a verified domain)
// and MAIL_FROM (the sender's address) and, if you like, MAIL_FROM_NAME.
const FROM = () => process.env.MAIL_FROM || '';
const NAME = () => process.env.MAIL_FROM_NAME || 'Chala Mobile';

const mailConfigured = () => !!FROM() && !!(process.env.BREVO_API_KEY || process.env.RESEND_API_KEY);

async function sendMail({ to, subject, text }) {
  if (!mailConfigured()) throw new Error('Mail is not set up');

  if (process.env.BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { email: FROM(), name: NAME() }, to: [{ email: to }], subject, textContent: text }),
    });
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
    // Brevo says "accepted" first and may refuse a moment later (most often: the sender address was never
    // verified there). Ask once or twice, so a refusal is reported instead of being taken for a sent email.
    const { messageId } = await res.json().catch(() => ({}));
    if (messageId) await assertNotRefused(messageId);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: `${NAME()} <${FROM()}>`, to: [to], subject, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function assertNotRefused(messageId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    // eslint-disable-next-line no-await-in-loop
    await wait(1200);
    try {
      const url = `https://api.brevo.com/v3/smtp/statistics/events?messageId=${encodeURIComponent(messageId)}&limit=10`;
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(url, { headers: { 'api-key': process.env.BREVO_API_KEY, accept: 'application/json' } });
      if (!res.ok) return;                       // cannot look it up: assume it is going out
      // eslint-disable-next-line no-await-in-loop
      const { events = [] } = await res.json();
      const refused = events.find(e => ['error', 'blocked', 'invalid', 'hardBounces'].includes(e.event));
      if (refused) throw Object.assign(new Error(refused.reason || `Brevo: ${refused.event}`), { refused: true });
      if (events.some(e => ['delivered', 'sent', 'deferred', 'opened'].includes(e.event))) return;
    } catch (err) {
      if (err.refused) throw err;
      return;
    }
  }
}

module.exports = { mailConfigured, sendMail };
