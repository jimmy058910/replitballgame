import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";

const app = express();
const port = process.env.PORT || 8080;

console.log('🚀 Starting ultra-minimal server...');

// Ultra-minimal middleware
app.use(express.json({ limit: '1mb' }));

// Health check - responds instantly
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: 'ultra-minimal',
    uptime: process.uptime()
  });
});

// Essential API endpoints with hardcoded responses (no database calls)
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    api: 'healthy',
    database: 'checking...',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/teams/my', (req, res) => {
  res.json({ needsTeamCreation: true });
});

app.get('/api/season/current-cycle', (req, res) => {
  res.json({ 
    currentDay: 1, 
    seasonNumber: 1, 
    phase: 'REGULAR_SEASON',
    status: 'active' 
  });
});

app.get('/api/matches/live', (req, res) => {
  res.json([]);
});

app.get('/api/camaraderie/summary', (req, res) => {
  res.json({ teamCamaraderie: 50, status: 'stable' });
});

app.get('/api/teams/my/next-opponent', (req, res) => {
  res.json({ error: 'No next opponent' });
});

app.get('/api/exhibitions/stats', (req, res) => {
  res.json({ totalExhibitions: 0, wins: 0, losses: 0, gamesPlayedToday: 0 });
});

// Static file serving
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(process.cwd(), 'dist');
  
  if (fs.existsSync(staticPath)) {
    console.log('📁 Serving static files from:', staticPath);
    app.use(express.static(staticPath));
    
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      return res.sendFile(path.join(staticPath, 'index.html'));
    });
  } else {
    console.log('⚠️ Static files not found');
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      return res.status(200).json({ 
        message: 'Realm Rivalry API Server', 
        version: 'ultra-minimal',
        timestamp: new Date().toISOString()
      });
    });
  }
}

// Error handler
app.use((error: Error, req: any, res: any, next: any) => {
  console.error('Error:', error.message);
  res.status(500).json({ error: 'Server error' });
});

// Create and start server immediately
const httpServer = createServer(app);

httpServer.listen(Number(port), '0.0.0.0', () => {
  console.log(`✅ Ultra-minimal server listening on port ${port}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Ready to serve traffic`);
  
  // Enhance with database functionality after server is running (non-blocking)
  if (process.env.NODE_ENV === 'production') {
    setImmediate(async () => {
      try {
        const { DatabaseEnhancer } = await import('./database-enhancer.js');
        const enhancer = DatabaseEnhancer.getInstance();
        await enhancer.initialize();
        await enhancer.enhanceApiRoutes(app);
        console.log('✅ Server enhanced with database functionality');
      } catch (error) {
        console.error('⚠️ Database enhancement failed, but server remains operational:', error);
      }
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Shutting down...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;