const { spawn } = require('child_process');
const path = require('path');

console.log('Starting server process...');

const serverPath = path.join(__dirname, 'server', 'index.js');
const serverProcess = spawn('node', [serverPath], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit'
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
});

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

console.log('Server process started with PID:', serverProcess.pid);
