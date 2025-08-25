// postinstall.js
const fs = require('fs');
const path = require('path');

// Create an empty tsconfig.json.tsbuildinfo file to prevent build errors
const tsbuildinfo = path.join(__dirname, '.next', 'tsconfig.json.tsbuildinfo');
if (!fs.existsSync(path.join(__dirname, '.next'))) {
  fs.mkdirSync(path.join(__dirname, '.next'), { recursive: true });
}
fs.writeFileSync(tsbuildinfo, '{}')
