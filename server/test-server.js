import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 8080;
console.log('🚀 PURE NODE.JS TEST SERVER STARTING...');
console.log('📍 Port:', port);
console.log('🌍 Environment:', process.env.NODE_ENV);
console.log('📁 Working directory:', process.cwd());
// Basic health check
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'pure-nodejs-test'
  });
});
// Basic test endpoint
app.get('/test', (req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({ message: 'Pure Node.js server working' });
});
// Simple HTML response for root
app.get('/', (req, res) => {
  console.log('📄 Root request');
  res.send(`
    <html>
      <head><title>Realm Rivalry Test</title></head>
      <body>
        <h1>Realm Rivalry Test Server</h1>
        <p>Server is running successfully!</p>
        <a href="/health">Health Check</a> | 
        <a href="/test">Test API</a>
      </body>
    </html>
  `);
});
// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Pure Node.js server listening on 0.0.0.0:${port}`);
  console.log('🎉 Ready for traffic!');
});
// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
  process.exit(1);
});
