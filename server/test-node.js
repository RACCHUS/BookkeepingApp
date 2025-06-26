console.log('Node.js is working!');
console.log('Current directory:', process.cwd());
console.log('Node version:', process.version);

setTimeout(() => {
  console.log('Timer test complete');
  process.exit(0);
}, 1000);
