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
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: `${NAME()} <${FROM()}>`, to: [to], subject, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

module.exports = { mailConfigured, sendMail };
