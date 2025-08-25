// Start the API server
const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Installing dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  console.log('\nStarting the API server...');
  execSync('npm run dev', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (error) {
  console.error('Error:', error.message);
}
