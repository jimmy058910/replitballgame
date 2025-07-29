import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM polyfill for __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

console.log('🚀 Starting MINIMAL Realm Rivalry server for debugging...');
console.log('📍 Port:', port);
console.log('🌍 Environment:', process.env.NODE_ENV);

// Basic middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('✅ Health check accessed');
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    port: port,
    environment: process.env.NODE_ENV,
    message: 'Minimal server is working!'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Minimal Realm Rivalry server is running!',
    port: port,
    paths: {
      health: '/health',
      environment: process.env.NODE_ENV
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ MINIMAL server listening on port ${port}`);
  console.log(`🏥 Health check: http://0.0.0.0:${port}/health`);
  console.log('🎉 Minimal server ready - no complex dependencies!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully');
  process.exit(0);
});