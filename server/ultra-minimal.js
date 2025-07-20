// Ultra minimal server - just JavaScript, no TypeScript
const express = require('express');

const app = express();
const port = process.env.PORT || 8080;

console.log('Starting ultra minimal server...');
console.log('PORT environment variable:', process.env.PORT);

// Health check
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).json({ 
    status: 'ok', 
    port: port,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint  
app.get('/', (req, res) => {
  console.log('Root endpoint requested');
  res.status(200).json({ 
    message: 'Realm Rivalry Ultra Minimal Server', 
    port: port
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`SUCCESS: Server listening on port ${port}`);
  console.log(`Health check: http://0.0.0.0:${port}/health`);
});

// Log every 10 seconds to show we're alive
setInterval(() => {
  console.log(`Server alive on port ${port} at ${new Date().toISOString()}`);
}, 10000);