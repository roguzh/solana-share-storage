const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 Building CLI executable...\n');

// Step 1: Compile TypeScript to JavaScript
console.log('1️⃣ Compiling TypeScript...');
execSync('npx tsc cli.ts --outDir ./dist --module commonjs --target es2020 --esModuleInterop --skipLibCheck --resolveJsonModule', { stdio: 'inherit' });

// Step 2: Bundle with pkg
console.log('\n2️⃣ Creating executables...');
execSync('npx pkg dist/cli.js --targets node18-win-x64,node18-macos-x64,node18-linux-x64 --output dist/royalties-cli', { stdio: 'inherit' });

console.log('\n✅ Build complete!');
console.log('\nExecutables created in ./dist/:');
console.log('  - royalties-cli-win.exe (Windows)');
console.log('  - royalties-cli-macos (macOS)');
console.log('  - royalties-cli-linux (Linux)');
