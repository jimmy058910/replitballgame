// Ultra-simple server - NO dependencies on any project code
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Ultra-simple server starting...');
console.log('📦 PORT:', PORT);
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('💗 Health check requested');
  res.json({ 
    status: 'healthy', 
    message: 'Ultra-simple deployment working!',
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// Serve static files
app.use(express.static('dist'));

// Simple API test
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    deployment: 'ultra-simple',
    success: true 
  });
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Ultra-simple server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 Test page: http://localhost:${PORT}/`);
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
