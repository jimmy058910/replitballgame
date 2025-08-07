import express from 'express';
import { createServer } from 'http';
import path from 'path';
const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
console.log('🚀 Starting MINIMAL Realm Rivalry server...');
console.log('📍 Port:', port);
console.log('🌍 Environment:', process.env.NODE_ENV);
console.log('🔐 Database URL exists:', !!process.env.DATABASE_URL);
console.log('🔑 Session secret exists:', !!process.env.SESSION_SECRET);
console.log('🔑 Google client secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);
app.use(express.json());
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'realm-rivalry-debug',
    port: port
  });
});
const staticPath = path.join(process.cwd(), 'dist');
app.use(express.static(staticPath));
app.get('*', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving index.html:', err);
      res.status(500).send('Error loading application');
    }
  });
});
const httpServer = createServer(app);
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`✅ DEBUG Server listening on port ${port}`);
  console.log(`🏥 Health check: http://0.0.0.0:${port}/health`);
  console.log('🎉 Minimal server ready!');
});
