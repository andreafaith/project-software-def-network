import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mode = process.argv[2] || 'default';

console.log('\x1b[36m%s\x1b[0m', 'Running Project Eye Tests...');
console.log('\x1b[36m%s\x1b[0m', '===========================');

const validModes = ['watch', 'coverage', 'verbose', 'default'];
if (!validModes.includes(mode)) {
    console.error('\x1b[31m%s\x1b[0m', `Invalid mode: ${mode}`);
    process.exit(1);
}

const args = ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js', '--detectOpenHandles'];

switch (mode) {
    case 'watch':
        args.push('--watch');
        console.log('\x1b[32m%s\x1b[0m', 'Running tests in watch mode...');
        break;
    case 'coverage':
        args.push('--coverage');
        console.log('\x1b[32m%s\x1b[0m', 'Running tests with coverage...');
        break;
    case 'verbose':
        args.push('--verbose');
        console.log('\x1b[32m%s\x1b[0m', 'Running tests in verbose mode...');
        break;
    default:
        console.log('\x1b[32m%s\x1b[0m', 'Running all tests...');
}

const test = spawn('node', args, {
    stdio: 'inherit',
    shell: true
});

test.on('error', (err) => {
    console.error('\x1b[31m%s\x1b[0m', 'Failed to start test process:', err);
    process.exit(1);
});

test.on('close', (code) => {
    if (code !== 0) {
        console.log('\n\x1b[31m%s\x1b[0m', 'Tests failed!');
        process.exit(code);
    } else {
        console.log('\n\x1b[32m%s\x1b[0m', 'All tests completed successfully!');
    }
});
