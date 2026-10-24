require('dotenv').config();

// Render's public ("External") database address only accepts encrypted connections, so
// turn encryption on for it. A local database and Render's internal address need none.
function connection() {
  const url = process.env.DATABASE_URL;
  if (url && /\.render\.com(?::|\/|$)/i.test(url)) {
    return { connectionString: url, ssl: { rejectUnauthorized: false } };
  }
  return url;
}

module.exports = {
  development: {
    client: 'pg',
    connection: connection(),
    migrations: { directory: './migrations' },
    seeds:      { directory: './seeds' },
  },
  production: {
    client: 'pg',
    connection: connection(),
    migrations: { directory: './migrations' },
    seeds:      { directory: './seeds' },
  },
};
