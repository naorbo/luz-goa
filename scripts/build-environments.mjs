import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function run(cmd, envOverrides = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...envOverrides },
  });
}

// 1. Strict TypeScript check
run('npx tsc -b');

// 2. Build clean PROD environment into /docs (root GitHub Pages)
run('npx vite build --outDir docs --emptyOutDir', { VITE_APP_ENV: 'prod' });

// 3. Build TEST sandbox environment into /docs/test (sub-route GitHub Pages)
run('npx vite build --outDir docs/test --emptyOutDir', { VITE_APP_ENV: 'test' });

// 4. Ensure GitHub Pages serves all static files without Jekyll processing
writeFileSync(resolve(root, 'docs', '.nojekyll'), '');

console.log('\nBuilt both environments successfully:');
console.log('  - PROD (Real Data Only): docs/');
console.log('  - TEST (Demo Sandbox):   docs/test/');
