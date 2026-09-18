import { spawn } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const testsRoot = join(repositoryRoot, 'tests');
const selectedSuite = process.argv[2];
const suiteDirectories = selectedSuite === undefined ? ['apex', 'deploy'] : [selectedSuite];
const outputDirectory = await mkdtemp(join(tmpdir(), 'planetary-typescript-tests-'));

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

try {
  const entries = (await Promise.all(suiteDirectories.map((suite) => walk(join(testsRoot, suite)))))
    .flat()
    .filter((name) => name.endsWith('.test.ts'))
    .sort();
  if (entries.length === 0) throw new Error('No TypeScript test files were found');
  await build({
    entryPoints: entries,
    outbase: testsRoot,
    outdir: outputDirectory,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    outExtension: { '.js': '.mjs' },
    logLevel: 'silent',
  });
  const testFiles = (await walk(outputDirectory)).filter((name) => name.endsWith('.test.mjs')).sort();
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--test', ...testFiles], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  process.exitCode = exitCode;
} finally {
  await rm(outputDirectory, { recursive: true, force: true });
}
