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

test('production build emits the Docker entrypoint and excludes tests', async () => {
  const productionTsconfig = await readFile(
    new URL('../tsconfig.production.json', import.meta.url),
    'utf8'
  );
  const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');

  expect(JSON.parse(productionTsconfig)).toMatchObject({
    compilerOptions: { rootDir: 'src', outDir: 'dist' },
    include: ['src'],
  });
  expect(dockerfile).toContain('ENTRYPOINT ["bun", "dist/index.js"]');
  expect(dockerfile).toContain('COPY tsconfig.production.json ./');
});
