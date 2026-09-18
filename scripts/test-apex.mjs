import { spawn } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const testsDirectory = join(repositoryRoot, 'tests', 'apex');
const outputDirectory = await mkdtemp(join(tmpdir(), 'planetary-apex-tests-'));

try {
  const entries = (await readdir(testsDirectory))
    .filter((name) => name.endsWith('.test.ts'))
    .sort()
    .map((name) => join(testsDirectory, name));
  if (entries.length === 0) throw new Error('No Apex test files were found');
  await build({
    entryPoints: entries,
    outdir: outputDirectory,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    outExtension: { '.js': '.mjs' },
    logLevel: 'silent',
  });
  const testFiles = (await readdir(outputDirectory))
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => join(outputDirectory, name));
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--test', ...testFiles], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  process.exitCode = exitCode;
} finally {
  await rm(outputDirectory, { recursive: true, force: true });
}
