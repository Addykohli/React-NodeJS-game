const { spawn } = require('child_process');
const path = require('path');

// Get number of instances from command line argument
const numInstances = parseInt(process.argv[2]) || 1;

// Function to start a React app on a specific port
function startReactApp(port) {
  const env = { ...process.env, PORT: port.toString() };
  const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  
  const app = spawn(cmd, ['run', 'start'], {
    env,
    stdio: 'inherit',
    shell: true
  });

  app.on('error', (err) => {
    console.error(`Error starting app on port ${port}:`, err);
  });

  return app;
}

// Start the specified number of instances
for (let i = 0; i < numInstances; i++) {
  // Skip port 3001 as it's used by the server
  let port = 3000 + i;
  if (port >= 3001) {
    port += 1; // Skip port 3001
  }
  console.log(`Starting instance ${i + 1} on port ${port}...`);
  startReactApp(port);
}

console.log(`\nStarted ${numInstances} instance${numInstances > 1 ? 's' : ''}`);
console.log('Press Ctrl+C to stop all instances'); 