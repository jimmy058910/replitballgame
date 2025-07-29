// Minimal production server - CommonJS for maximum compatibility
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Starting minimal production server...');
console.log('📂 Current directory:', process.cwd());
console.log('🔧 Node version:', process.version);
console.log('📦 PORT:', PORT);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// Serve static files from dist
const staticPath = path.join(process.cwd(), 'dist');
console.log('📁 Serving static files from:', staticPath);

app.use(express.static(staticPath));

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  const indexPath = path.join(staticPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Error loading application');
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
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