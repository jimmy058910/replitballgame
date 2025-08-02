// Industry Standard Express Server for Cloud Run
// Follows Google Cloud Run best practices exactly

const express = require('express');
const path = require('path');

const app = express();

// Essential: Use PORT environment variable (Cloud Run requirement)
const port = parseInt(process.env.PORT) || 8080;

// Basic middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint (Cloud Run requirement)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'api-healthy',
    timestamp: new Date().toISOString()
  });
});

// Essential API endpoints for frontend
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

// Serve frontend for all routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Cloud Run requires listening on all interfaces (0.0.0.0)
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server listening on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

// Graceful shutdown handling (Cloud Run best practice)
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});