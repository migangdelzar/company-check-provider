import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
) as {
  scripts?: Record<string, string>;
};

test('provider quality rules expose deterministic formatting and strict TypeScript linting', async () => {
  const eslintConfig = await readFile(new URL('../eslint.config.js', import.meta.url), 'utf8');

  expect(packageJson.scripts?.format).toBe('prettier --write .');
  expect(packageJson.scripts?.['format:check']).toBe('prettier --check .');
  expect(packageJson.scripts?.test).toBe('bun test --frozen-lockfile test/*.test.ts');
  expect(eslintConfig).toContain('explicit-function-return-type');
  expect(eslintConfig).toContain('no-explicit-any');
});
