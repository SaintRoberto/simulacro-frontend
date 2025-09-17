const fs = require('fs');
const path = require('path');

// List of required components
const requiredComponents = [
  'src/App.tsx',
  'src/index.tsx',
  'src/index.css',
  'src/reportWebVitals.ts',
  'src/components/layout/Layout.tsx',
  'src/pages/Dashboard.tsx',
  'src/pages/auth/Login.tsx',
  'src/pages/auth/Register.tsx',
  'public/index.html',
  'public/manifest.json',
  'public/favicon.ico'
];

console.log('Verifying required files...');
let allFilesExist = true;

requiredComponents.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✓' : '✗'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (allFilesExist) {
  console.log('\n✅ All required files are present!');
  console.log('Try running the application with: npm run dev');
} else {
  console.log('\n❌ Some required files are missing.');
  console.log('Please make sure all the above files exist before running the application.');
}
