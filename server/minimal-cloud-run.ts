import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

const app = express();
const PORT = process.env.PORT || 8080;

// Security and performance middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "https:"],
    },
  },
}));

// CORS configuration for Firebase Hosting
app.use(cors({
  origin: [
    'https://realmrivalry.com',
    'https://www.realmrivalry.com',
    'https://direct-glider-465821-p7.web.app',
    'https://direct-glider-465821-p7.firebaseapp.com',
    'http://localhost:5000',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'realm-rivalry-backend-minimal',
    environment: process.env.NODE_ENV || 'production'
  });
});

// Essential API endpoints that frontend needs
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'realm-rivalry-api' });
});

// Team endpoints - provide basic responses with 200 status
app.get('/api/teams/my', (req, res) => {
  res.status(200).json({ 
    team: null,
    message: 'No team found - create your dynasty first',
    needsTeamCreation: true 
  });
});

app.get('/api/teams/my/next-opponent', (req, res) => {
  res.status(200).json({ 
    opponent: null,
    message: 'No next opponent - create team first',
    needsTeamCreation: true 
  });
});

// Match endpoints
app.get('/api/matches/live', (req, res) => {
  res.json({ liveMatches: [] });
});

// Camaraderie endpoints
app.get('/api/camaraderie/summary', (req, res) => {
  res.status(200).json({ 
    totalCamaraderie: 0,
    weeklyChange: 0,
    needsTeamCreation: true
  });
});

// Exhibition endpoints
app.get('/api/exhibitions/stats', (req, res) => {
  res.status(200).json({ 
    totalExhibitions: 0,
    wins: 0,
    losses: 0,
    needsTeamCreation: true
  });
});

// Season endpoints
app.get('/api/season/current-cycle', (req, res) => {
  res.status(200).json({
    seasonNumber: 1,
    currentDay: 1,
    phase: 'preparation',
    cycle: 1,
    startDate: '2025-08-01',
    needsTeamCreation: true
  });
});

// Team-specific endpoints
app.get('/api/teams/:teamId/finances', (req, res) => {
  res.status(200).json({
    credits: 0,
    gems: 0,
    needsTeamCreation: true
  });
});

app.get('/api/teams/:teamId/notifications', (req, res) => {
  res.status(200).json({
    notifications: [],
    unreadCount: 0
  });
});

app.get('/api/teams/:teamId/matches/upcoming', (req, res) => {
  res.status(200).json({
    upcomingMatches: [],
    needsTeamCreation: true
  });
});

// Matches endpoints  
app.get('/api/matches/live', (req, res) => {
  res.status(200).json({
    liveMatches: []
  });
});

// Auth endpoints - minimal responses
app.get('/api/user', (req, res) => {
  res.json({ 
    authenticated: false,
    message: 'Authentication handled by Firebase client-side' 
  });
});

// Catch-all for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    message: 'This is a minimal backend - some features not yet implemented'
  });
});

// Start server
app.listen(parseInt(PORT.toString()), '0.0.0.0', () => {
  console.log(`🚀 Minimal Backend server listening on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base: http://localhost:${PORT}/api`);
  console.log(`🌐 CORS enabled for realmrivalry.com`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});