// Copies the single-file web build (apps/web/dist/index.html) to the project root, so Spend Lens
// keeps opening by double-clicking index.html. Refuses to publish a build that isn't self-contained.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const built = readFileSync(root + 'apps/web/dist/index.html', 'utf8');
const external = [...built.matchAll(/<script[^>]+src="(?!https:\/\/)([^"]+)"/g)].map(m => m[1]);
if (external.length) { console.error('Build references local files, which Chrome blocks on file://:', external); process.exit(1); }
writeFileSync(root + 'index.html', built);
console.log(`Published index.html (${(statSync(root + 'index.html').size / 1e6).toFixed(2)} MB)`);
