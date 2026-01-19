#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Next.js dev server...');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);

const child = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname),
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('Failed to start dev server:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Dev server exited with code ${code}`);
  process.exit(code);
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  child.kill();
  process.exit(0);
});
