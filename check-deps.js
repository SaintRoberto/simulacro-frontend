const fs = require('fs');
const path = require('path');

console.log('Checking for node_modules...');
const nodeModulesPath = path.join(__dirname, 'node_modules');

if (!fs.existsSync(nodeModulesPath)) {
  console.log('❌ node_modules directory not found. Please run: npm install');
  process.exit(1);
}

console.log('✅ node_modules directory exists');
console.log('\nTo start the development server, run:');
console.log('  npm run dev');
