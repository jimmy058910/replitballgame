// Minimal server for Cloud Run deployment
// Industry standard approach - start simple, add features later

import express from "express";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Essential middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Health check (Cloud Run requirement)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'api-healthy',
    timestamp: new Date().toISOString()
  });
});

// Essential API endpoints (stub responses)
app.get('/api/user/profile', (req, res) => {
  res.json({ 
    message: 'Profile endpoint ready',
    authenticated: false
  });
});

app.get('/api/season/current-cycle', (req, res) => {
  res.json({
    currentDay: 1,
    seasonNumber: 1,
    phase: 'REGULAR_SEASON'
  });
});

app.get('/api/teams/my/next-opponent', (req, res) => {
  res.json({ 
    opponent: 'Thunder Hawks', 
    matchTime: '2025-08-03T15:00:00Z' 
  });
});

app.get('/api/camaraderie/summary', (req, res) => {
  res.json({ 
    teamCamaraderie: 85, 
    playerRelations: [] 
  });
});

app.get('/api/matches/live', (req, res) => {
  res.json({ liveMatches: [] });
});

app.get('/api/exhibitions/stats', (req, res) => {
  res.json({ 
    exhibitionStats: { played: 0, won: 0, lost: 0 } 
  });
});

// Catch all - serve React app for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// CRITICAL: Cloud Run port configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

// Start server (Cloud Run compatible)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Realm Rivalry minimal server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Frontend served from: ${path.join(__dirname, '../dist')}`);
});

// Graceful shutdown (Cloud Run best practice)
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});