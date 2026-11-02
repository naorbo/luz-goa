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

// 2. Build clean PROD environment into /docs (wipes out any legacy /docs/test folder)
run('npx vite build --outDir docs --emptyOutDir', { VITE_APP_ENV: 'prod' });

// 3. Ensure GitHub Pages serves all static files without Jekyll processing
writeFileSync(resolve(root, 'docs', '.nojekyll'), '');

console.log('\nBuilt production launch bundle successfully (Admin & TEST locked behind Google Auth):');
console.log('  - PROD (Public Launch): docs/');
