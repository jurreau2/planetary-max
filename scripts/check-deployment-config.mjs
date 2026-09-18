import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const configPath = fileURLToPath(new URL('../wrangler.toml', import.meta.url));
const source = await readFile(configPath, 'utf8');
const required = [
  'account_id',
  'PORTAL_OS_PHASE = "16"',
  'binding = "KERNEL_SERVICE"',
  'binding = "PORTAL_R2"',
  'binding = "PORTAL_KV"',
  'binding = "PORTAL_D1"',
];
const issues = required.filter((value) => !source.includes(value)).map((value) => `Missing Wrangler setting: ${value}`);
if (/00000000000000000000000000000000|11111111111111111111111111111111|00000000-0000-0000-0000-000000000000|11111111-1111-1111-1111-111111111111/.test(source)) {
  issues.push('Cloudflare account, KV, or D1 resource identifiers are still unverified sentinels');
}
if (issues.length > 0) {
  for (const issue of issues) process.stderr.write(`${issue}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Deployment configuration is ready\n');
}
