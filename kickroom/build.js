#!/usr/bin/env node
/* Inlines src/core.js into src/app-shell.html and writes index.html. No dependencies. */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const core = fs.readFileSync(path.join(root, 'src/core.js'), 'utf8').replace(/if \(typeof module[\s\S]*$/, '');
const shell = fs.readFileSync(path.join(root, 'src/app-shell.html'), 'utf8');
if (!shell.includes('/*__CORE__*/')) { console.error('app-shell.html mist de /*__CORE__*/ marker'); process.exit(1); }
const out = shell.replace('/*__CORE__*/', core);
fs.writeFileSync(path.join(root, 'index.html'), out);
console.log('index.html geschreven — ' + (out.length / 1024).toFixed(1) + ' kB');
