#!/usr/bin/env node
/* Inlines src/core.js into src/app-shell.html and writes index.html. No dependencies. */
const fs = require('fs');
const path = require('path');
const root = __dirname;
const core = fs.readFileSync(path.join(root, 'src/core.js'), 'utf8').replace(/if \(typeof module[\s\S]*$/, '');
const shell = fs.readFileSync(path.join(root, 'src/app-shell.html'), 'utf8');
if (!shell.includes('/*__CORE__*/')) { console.error('app-shell.html mist de /*__CORE__*/ marker'); process.exit(1); }
const vocal = fs.readFileSync(path.join(root,'src/vocal-engine.js'),'utf8').replace(/if\(typeof module[\s\S]*$/, '');
const out = shell.replace('/*__CORE__*/', core+'\n'+vocal+'\n'+fs.readFileSync(path.join(root,'src/composer.js'),'utf8').replace(/if\(typeof module[\s\S]*$/, ''))
  .replace('/*__EXPRESSION_ENGINE__*/', fs.readFileSync(path.join(root,'src/expression-engine.js'),'utf8'))
  .replace('/*__EXPRESSION__*/', fs.readFileSync(path.join(root,'src/expression.js'),'utf8'))
  .replace('/*__SCENES__*/', fs.readFileSync(path.join(root,'src/scenes.js'),'utf8'))
  .replace('/*__SCULPTOR_ENGINE__*/', fs.readFileSync(path.join(root,'src/sculptor-engine.js'),'utf8'))
  .replace('/*__SCULPTOR__*/', fs.readFileSync(path.join(root,'src/sculptor.js'),'utf8'))
  .replace('/*__MIDI_IMPORT__*/', fs.readFileSync(path.join(root,'src/midi-import.js'),'utf8'))
  .replace('/*__GROOVE__*/', fs.readFileSync(path.join(root,'src/groove.js'),'utf8'))
  .replace('/*__CONVERSATION_ENGINE__*/', fs.readFileSync(path.join(root,'src/conversation-engine.js'),'utf8'))
  .replace('/*__CONVERSATION__*/', fs.readFileSync(path.join(root,'src/conversation.js'),'utf8'))
  .replace('/*__STEM_ENGINE__*/', fs.readFileSync(path.join(root,'src/stem-engine.js'),'utf8'))
  .replace('/*__STEMS__*/', fs.readFileSync(path.join(root,'src/stems.js'),'utf8'))
  .replace('/*__STUDIO__*/', fs.readFileSync(path.join(root,'src/studio.js'),'utf8'))
  .replace('/*__SKIN__*/', fs.readFileSync(path.join(root,'src/skin.js'),'utf8'))
  .replace('/*__DISCOVERY_ENGINE__*/', fs.readFileSync(path.join(root,'src/discovery-engine.js'),'utf8'))
  .replace('/*__DISCOVERY__*/', fs.readFileSync(path.join(root,'src/discovery.js'),'utf8'))
  .replace('/*__THEME__*/', fs.readFileSync(path.join(root,'src/theme.css'),'utf8'))
  .replace('/*__WORKSPACE__*/', fs.readFileSync(path.join(root,'src/workspace.js'),'utf8'))
  .replace('/*__PROJECTS__*/', fs.readFileSync(path.join(root,'src/projects.js'),'utf8'))
  .replace('/*__SESSION__*/', fs.readFileSync(path.join(root,'src/session.js'),'utf8'))
  .replace('/*__DAW__*/', fs.readFileSync(path.join(root,'src/daw.js'),'utf8'))
  .replace('/*__PRODUCTION__*/', fs.readFileSync(path.join(root,'src/production.js'),'utf8'))
  .replace('/*__ARRANGER__*/', fs.readFileSync(path.join(root,'src/arranger.js'),'utf8'));
fs.writeFileSync(path.join(root, 'index.html'), out);
console.log('index.html geschreven — ' + (out.length / 1024).toFixed(1) + ' kB');
