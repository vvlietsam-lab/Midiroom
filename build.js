#!/usr/bin/env node
/* Inlines src/core.js into src/app-shell.html and writes index.html. No dependencies. */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const core = fs.readFileSync(path.join(root, 'src/core.js'), 'utf8').replace(/if \(typeof module[\s\S]*$/, '');
const shell = fs.readFileSync(path.join(root, 'src/app-shell.html'), 'utf8');
if (!shell.includes('/*__CORE__*/')) { console.error('app-shell.html mist de /*__CORE__*/ marker'); process.exit(1); }
const vocal = fs.readFileSync(path.join(root,'src/vocal-engine.js'),'utf8').replace(/if\(typeof module[\s\S]*$/, '');
const out = shell.replace('/*__CORE__*/', core+'\n'+vocal)
  .replace('/*__THEME__*/', fs.readFileSync(path.join(root,'src/theme.css'),'utf8'))
  .replace('/*__WORKSPACE__*/', fs.readFileSync(path.join(root,'src/workspace.js'),'utf8'))
  .replace('/*__DAW__*/', fs.readFileSync(path.join(root,'src/daw.js'),'utf8'))
  .replace('/*__PRODUCTION__*/', fs.readFileSync(path.join(root,'src/production.js'),'utf8')); 
fs.writeFileSync(path.join(root, 'index.html'), out);
console.log('index.html geschreven — ' + (out.length / 1024).toFixed(1) + ' kB');
