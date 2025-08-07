// Ultra-minimal server - no imports from our codebase
import express from 'express';
import path from 'path';
const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
console.log('🚀 ULTRA-MINIMAL Realm Rivalry server starting...');
console.log('📍 Port:', port);
console.log('🌍 Environment:', process.env.NODE_ENV);
// Basic middleware
app.use(express.json());
// Health check endpoint
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'realm-rivalry-minimal',
    port: port
  });
});
// Basic test endpoint
app.get('/api/test', (req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({ 
    message: 'Minimal server is working',
    timestamp: new Date().toISOString()
  });
});
// Serve static files from dist
const staticPath = path.join(process.cwd(), 'dist');
console.log('📁 Static path:', staticPath);
app.use(express.static(staticPath));
// Catch-all for React routes
app.get('*', (req, res) => {
  console.log(`📄 Serving React app for: ${req.path}`);
  res.sendFile(path.join(staticPath, 'index.html'), (err) => {
    if (err) {
      console.error('❌ Error:', err.message);
      res.status(500).send('App loading error');
    }
  });
});
// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ MINIMAL server listening on 0.0.0.0:${port}`);
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
