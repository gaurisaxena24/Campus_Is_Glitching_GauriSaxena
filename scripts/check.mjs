// Build check for a no-bundler project: every JS module parses and imports,
// and every local file referenced from index.html and CSS exists.
import { readFile, readdir, access } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
let problems = 0;
const fail = (msg) => { problems++; console.error('  FAIL', msg); };

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const js = (await walk(join(root, 'src'))).filter((f) => f.endsWith('.js'));
for (const f of js) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { fail(`syntax: ${f}\n${e.stderr}`); }
}
// Logic modules must import cleanly in Node (UI modules need a browser).
for (const f of js.filter((f) => /[\\/](data|game)[\\/]/.test(f))) {
  try { await import(pathToFileURL(f)); } catch (e) { fail(`import: ${f}: ${e.message}`); }
}

const html = await readFile(join(root, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((m) => m[1].split('?')[0]).filter((r) => !r.startsWith('http'));
for (const r of refs) await access(join(root, r)).catch(() => fail(`index.html references missing file: ${r}`));

const css = (await walk(join(root, 'src', 'styles'))).filter((f) => f.endsWith('.css'));
for (const f of css) {
  const text = await readFile(f, 'utf8');
  for (const m of text.matchAll(/url\('([^')]+)'\)/g)) {
    if (m[1].startsWith('data:')) continue;
    await access(resolve(dirname(f), m[1])).catch(() => fail(`${f} references missing file: ${m[1]}`));
  }
}

console.log(problems ? `check: ${problems} problem(s)` : `check: OK (${js.length} JS modules, ${refs.length} HTML refs, ${css.length} stylesheets)`);
process.exit(problems ? 1 : 0);
