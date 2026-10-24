// Turns a database connection failure into something a person can act on.
function explainDbError(err) {
  const url = process.env.DATABASE_URL || '';
  const host = (url.match(/@([^:/?]+)/) || [])[1] || '';
  const code = err && (err.code || (err.message || '').match(/ENOTFOUND|ECONNREFUSED|ETIMEDOUT/)?.[0]);

  // Render gives every database two addresses. The short "dpg-xxxx-a" one only works inside Render.
  if (code === 'ENOTFOUND' && /^dpg-[a-z0-9]+-[a-z]$/.test(host)) {
    return `Cannot reach the database: "${host}" is Render's INTERNAL address, which only works from inside Render.\n`
      + '   To run the backend on your own computer, put the EXTERNAL Database URL in crm_backend/.env:\n'
      + '   Render dashboard > your PostgreSQL database > Connections > External Database URL\n'
      + '   (it looks like postgresql://user:password@dpg-xxxx-a.<region>-postgres.render.com/dbname).\n'
      + '   Keep the short internal address for the Render web service itself.';
  }
  if (code === 'ECONNREFUSED') return `Cannot reach the database at ${host || 'the address in DATABASE_URL'}: connection refused. Is PostgreSQL running?`;
  if (code === 'ETIMEDOUT') return `Timed out reaching the database at ${host}. Check DATABASE_URL and that the database allows connections from here.`;
  if (!url) return 'DATABASE_URL is not set. Copy .env.example to .env and fill it in.';
  return `Cannot use the database: ${err && err.message}`;
}

module.exports = { explainDbError };
