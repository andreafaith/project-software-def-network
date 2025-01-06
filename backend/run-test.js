import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\x1b[36m%s\x1b[0m', 'Running Project Eye Tests...');
console.log('\x1b[36m%s\x1b[0m', '===========================');

console.log('\x1b[32m%s\x1b[0m', 'Running all tests...');

process.env.NODE_ENV = 'test';

const jest = spawn(
  'npx',
  ['jest', '--config', 'jest.config.js'],
  {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' },
    shell: true
  }
);

jest.on('close', (code) => {
  if (code !== 0) {
    console.log('\n\x1b[31m%s\x1b[0m', 'Tests failed!');
    process.exit(code);
  } else {
    console.log('\n\x1b[32m%s\x1b[0m', 'All tests completed successfully!');
  }
});
