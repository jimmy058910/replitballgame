// Minimal server for testing Cloud Run deployment
import express from 'express';

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: port,
    env: process.env.NODE_ENV 
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Realm Rivalry Minimal Server', 
    port: port,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Minimal server listening on port ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
});