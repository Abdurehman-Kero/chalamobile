// Lists the texts the app shows that have no Afaan Oromoo or Amharic translation yet, and
// translations nobody uses any more.   npm run i18n:check
//
// A text is written in the code as t('Save changes') (or tx('Save changes') when it is a label
// kept in a constant and translated where it is drawn). The English text is the key.
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const SRC = path.join(__dirname, '..', 'src');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'i18n' ? [] : walk(p);
    return /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

const used = new Map();
const CALL = /\b(?:t|tt|tr|tx)\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(CALL)) {
    const key = m[2].replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');
    if (!used.has(key)) used.set(key, path.relative(SRC, file));
  }
}

function load(name) {
  const code = ts.transpileModule(fs.readFileSync(path.join(SRC, 'i18n', `${name}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', code)(mod, mod.exports);
  return mod.exports[name];
}

let problems = 0;
for (const lang of ['om', 'am']) {
  const dict = load(lang);
  const missing = [...used.keys()].filter((k) => !(k in dict));
  const unused = Object.keys(dict).filter((k) => !used.has(k));
  console.log(`${lang}: ${used.size - missing.length}/${used.size} translated`);
  missing.forEach((k) => console.log(`  missing  ${JSON.stringify(k)}  (${used.get(k)})`));
  unused.forEach((k) => console.log(`  unused   ${JSON.stringify(k)}`));
  problems += missing.length;
}
process.exit(problems ? 1 : 0);
