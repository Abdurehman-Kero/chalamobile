// Tidies the settings the host gives us, so a stray space or quote pasted into a setting's name or value
// ("BREVO_API_KEY " or "\"abc\"") does not silently switch a feature off. Load right after dotenv.
for (const name of Object.keys(process.env)) {
  const clean = name.trim();
  let value = process.env[name];
  if (typeof value === 'string') value = value.trim().replace(/^(['"])(.*)\1$/, '$2');
  if (clean !== name) {
    if (!(clean in process.env) || !String(process.env[clean]).trim()) process.env[clean] = value;
  } else {
    process.env[name] = value;
  }
}
