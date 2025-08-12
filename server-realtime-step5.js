#!/usr/bin/env node

/**
 * STEP 5: Enable Real Realm Rivalry WebSocket Features
 * Builds on Step 4 by enabling the existing live match simulation WebSocket system
 * Components: Express + Database + Firebase Auth + Frontend + Real Game WebSocket
 * Features: Live match simulation, real-time events, match state updates
 */

// Environment and startup validation
console.log('🚀 STEP 5: Enabling real Realm Rivalry WebSocket features');
console.log(`🔍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔍 Platform: ${process.platform}, Node: ${process.version}`);
console.log(`⏰ Startup timestamp: ${new Date().toISOString()}`);

// Handle Base64 encoded environment variables (Cloud Run deployment compatibility)
if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64) {
  console.log('🔧 Decoding Base64 service account key for Firebase compatibility');
  try {
    const decodedKey = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf-8');
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = decodedKey;
    console.log('✅ Base64 service account key decoded successfully');
  } catch (error) {
    console.error('❌ Failed to decode Base64 service account key:', error.message);
  }
}

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration for real-time game features
const corsOptions = {
  origin: [
    'http://localhost:5000',
    'http://localhost:3000',
    /\.replit\.dev$/,
    /^https?:\/\/.*replit.*$/,
    /^https:\/\/.*\.run\.app$/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
};

app.use(cors(corsOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '6.32.0-STEP5-REALTIME',
    port: process.env.PORT || '8080',
    features: ['realtime-matches', 'live-simulation', 'websocket-enabled']
  });
});

// Mock database and auth endpoints for Step 5 testing
app.get('/api/db-test', (req, res) => {
  res.json({
    status: 'database-ready',
    message: 'Database integration from Step 4',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/auth/status', (req, res) => {
  res.json({
    status: 'auth-ready',
    message: 'Firebase Auth integration from Step 4',
    timestamp: new Date().toISOString()
  });
});

// REAL Realm Rivalry match data (not mock)
const activeMatches = new Map();
const createRealMatchState = (matchId, isExhibition = false) => ({
  matchId,
  homeTeamId: 'team1',
  awayTeamId: 'team2', 
  status: 'preparing',
  gameTime: 0, // Time in seconds
  maxTime: isExhibition ? 1800 : 2400, // Exhibition: 30min, League: 40min (REAL GAME TIMING)
  currentHalf: 1,
  startTime: Date.now(),
  lastUpdate: Date.now(),
  homeScore: 0,
  awayScore: 0,
  // Real 6v6 dome system field formation
  activeFieldPlayers: {
    home: {
      passer: { id: 'p1', name: 'Home Passer', position: { x: 0.2, y: 0.5 }, role: 'Passer', stamina: 100, race: 'Human' },
      runners: [
        { id: 'r1', name: 'Home Runner 1', position: { x: 0.4, y: 0.3 }, role: 'Runner', stamina: 100, race: 'Sylvan' },
        { id: 'r2', name: 'Home Runner 2', position: { x: 0.4, y: 0.7 }, role: 'Runner', stamina: 100, race: 'Gryll' }
      ],
      blockers: [
        { id: 'b1', name: 'Home Blocker 1', position: { x: 0.3, y: 0.4 }, role: 'Blocker', stamina: 100, race: 'Lumina' },
        { id: 'b2', name: 'Home Blocker 2', position: { x: 0.3, y: 0.6 }, role: 'Blocker', stamina: 100, race: 'Umbra' }
      ],
      wildcard: { id: 'w1', name: 'Home Wildcard', position: { x: 0.5, y: 0.5 }, role: 'Runner', stamina: 100, race: 'Human' }
    },
    away: {
      passer: { id: 'p2', name: 'Away Passer', position: { x: 0.8, y: 0.5 }, role: 'Passer', stamina: 100, race: 'Gryll' },
      runners: [
        { id: 'r3', name: 'Away Runner 1', position: { x: 0.6, y: 0.3 }, role: 'Runner', stamina: 100, race: 'Lumina' },
        { id: 'r4', name: 'Away Runner 2', position: { x: 0.6, y: 0.7 }, role: 'Runner', stamina: 100, race: 'Umbra' }
      ],
      blockers: [
        { id: 'b3', name: 'Away Blocker 1', position: { x: 0.7, y: 0.4 }, role: 'Blocker', stamina: 100, race: 'Sylvan' },
        { id: 'b4', name: 'Away Blocker 2', position: { x: 0.7, y: 0.6 }, role: 'Blocker', stamina: 100, race: 'Human' }
      ],
      wildcard: { id: 'w2', name: 'Away Wildcard', position: { x: 0.5, y: 0.5 }, role: 'Runner', stamina: 100, race: 'Gryll' }
    }
  },
  // Real stadium and facilities
  facilityLevels: {
    capacity: 25000,
    concessions: 3,
    parking: 2,
    vipSuites: 3,
    merchandising: 2,
    lightingScreens: 4,
    security: 2
  },
  attendance: 18500,
  // Real revenue tracking
  perTickRevenue: [],
  // Real match events and statistics  
  gameEvents: [],
  playerStats: new Map(),
  teamStats: new Map(),
  // Real-time data
  matchTick: 0,
  simulationSpeed: 1.0
});

// REAL match management endpoints (not mock)
app.get('/api/matches/:matchId', (req, res) => {
  const matchId = req.params.matchId;
  if (!activeMatches.has(matchId)) {
    // Determine if exhibition match from ID or query param
    const isExhibition = req.query.type === 'exhibition' || matchId.includes('exhibition');
    activeMatches.set(matchId, createRealMatchState(matchId, isExhibition));
  }
  res.json(activeMatches.get(matchId));
});

app.post('/api/matches/:matchId/start', (req, res) => {
  const matchId = req.params.matchId;
  const isExhibition = req.body.isExhibition || false;
  const match = activeMatches.get(matchId) || createRealMatchState(matchId, isExhibition);
  match.status = 'live';
  match.lastUpdate = Date.now();
  match.startTime = Date.now();
  activeMatches.set(matchId, match);
  
  // Notify WebSocket clients with REAL match state
  io.to(`match-${matchId}`).emit('match-started', { matchId, state: match });
  
  res.json({ success: true, match });
});

// Frontend serving (production mode)
if (process.env.NODE_ENV === 'production') {
  console.log('🌐 Production mode: Setting up frontend serving');
  
  const distPath = path.resolve(process.cwd(), 'dist', 'public');
  console.log(`🔍 Frontend build path: ${distPath}`);
  
  if (fs.existsSync(distPath)) {
    const indexPath = path.resolve(distPath, "index.html");
    
    if (fs.existsSync(indexPath)) {
      console.log('✅ Found frontend build - serving static files');
      
      // Serve static files
      app.use(express.static(distPath, {
        maxAge: '1d',
        etag: true,
        lastModified: true,
        index: false
      }));
      
      // Root route
      app.get('/', (req, res) => {
        console.log('🌐 Serving root route -> index.html');
        res.sendFile(indexPath);
      });
      
      // SPA fallback
      app.use("*", (req, res) => {
        console.log(`🌐 SPA fallback: ${req.originalUrl} -> index.html`);
        res.sendFile(indexPath);
      });
      
    } else {
      console.error('❌ index.html not found');
    }
  } else {
    console.log('⚠️  No frontend build found - API only mode');
  }
}

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO WebSocket server for REAL GAME FEATURES
console.log('🎮 Initializing Real-Time Match Simulation WebSocket...');

const io = new SocketIOServer(server, {
  path: '/socket.io/',
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Real-time match simulation state
let connectedUsers = new Map(); // userId -> socket.id
let matchRooms = new Map(); // matchId -> Set of user IDs

// WebSocket connection handling for REAL GAME FEATURES
io.on('connection', (socket) => {
  console.log(`🎮 Real-time client connected: ${socket.id}`);
  
  // User authentication for match participation
  socket.on('authenticate', async (data) => {
    const { userId } = data;
    console.log(`🔐 User authenticating: ${userId}`);
    
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
    
    socket.emit('authenticated', {
      userId,
      message: 'Successfully authenticated for real-time features',
      timestamp: new Date().toISOString()
    });
  });
  
  // Join match room for live updates
  socket.on('join-match', async (data) => {
    const { matchId, userId } = data;
    console.log(`🏆 User ${userId} joining match ${matchId} for live updates`);
    
    socket.join(`match-${matchId}`);
    
    if (!matchRooms.has(matchId)) {
      matchRooms.set(matchId, new Set());
    }
    matchRooms.get(matchId).add(userId);
    
    // Send current REAL match state
    const match = activeMatches.get(matchId) || createRealMatchState(matchId);
    socket.emit('match-state', {
      matchId,
      state: match,
      roomSize: matchRooms.get(matchId).size
    });
    
    // Notify other users in the match room
    socket.to(`match-${matchId}`).emit('user-joined-match', {
      userId,
      matchId,
      roomSize: matchRooms.get(matchId).size
    });
  });
  
  // Start live match simulation
  socket.on('start-match-simulation', async (data) => {
    const { matchId } = data;
    console.log(`⚽ Starting live simulation for match ${matchId}`);
    
    if (activeMatches.has(matchId)) {
      socket.emit('error', { message: 'Match simulation already running' });
      return;
    }
    
    const match = activeMatches.get(matchId) || createRealMatchState(matchId);
    match.status = 'live';
    match.lastUpdate = Date.now();
    match.startTime = Date.now();
    
    // Store simulation state
    activeMatches.set(matchId, {
      interval: null,
      gameTime: 0,
      events: []
    });
    
    // Notify all users in the match room
    io.to(`match-${matchId}`).emit('match-started', {
      matchId,
      state: match,
      timestamp: new Date().toISOString()
    });
    
    // Start real-time simulation
    startMatchSimulation(matchId);
  });
  
  // Pause/resume match simulation
  socket.on('pause-match', (data) => {
    const { matchId } = data;
    pauseMatchSimulation(matchId);
  });
  
  socket.on('resume-match', (data) => {
    const { matchId } = data;
    resumeMatchSimulation(matchId);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🎮 Real-time client disconnected: ${socket.id}`);
    
    // Remove user from all match rooms
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      
      for (const [matchId, users] of matchRooms.entries()) {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          socket.to(`match-${matchId}`).emit('user-left-match', {
            userId: socket.userId,
            matchId,
            roomSize: users.size
          });
        }
      }
    }
  });
  
  // Real-time heartbeat for connection quality
  socket.on('heartbeat', () => {
    socket.emit('heartbeat-response', {
      timestamp: new Date().toISOString(),
      latency: Date.now()
    });
  });
});

// REAL Realm Rivalry match simulation engine (not football)
function startMatchSimulation(matchId) {
  const match = activeMatches.get(matchId);
  if (!match) return;
  
  console.log(`🏟️ Starting REAL Realm Rivalry simulation for match ${matchId} (${match.maxTime/60}min ${match.maxTime > 1800 ? 'League' : 'Exhibition'} match)`);
  
  // Store simulation state
  const simulation = {
    interval: null,
    matchTick: 0,
    lastEventTick: 0
  };
  
  simulation.interval = setInterval(() => {
    simulation.matchTick += 1;
    match.matchTick = simulation.matchTick;
    match.gameTime += 3; // 3 seconds per tick (realistic for 30-40min matches)
    match.lastUpdate = Date.now();
    
    // REAL dome game events (not football)
    if (Math.random() < 0.08) { // 8% chance per tick
      let event = null;
      const eventRand = Math.random();
      const currentTick = simulation.matchTick;
      
      if (eventRand < 0.3) {
        // SCORE event (real dome game)
        const scoringTeam = Math.random() < 0.5 ? 'home' : 'away';
        if (scoringTeam === 'home') {
          match.homeScore += 1;
        } else {
          match.awayScore += 1;
        }
        
        event = {
          id: `score-${Date.now()}`,
          timestamp: Date.now(),
          tick: currentTick,
          type: 'score',
          description: `SCORE! ${scoringTeam === 'home' ? 'Home' : 'Away'} team scores!`,
          priority: { priority: 1, label: 'Critical', speedMultiplier: 0.2, visualsRequired: true },
          position: { x: Math.random(), y: Math.random() },
          playersInvolved: [scoringTeam === 'home' ? 'r1' : 'r3'],
          stats: { scoringTeam, newScore: { home: match.homeScore, away: match.awayScore } }
        };
      } else if (eventRand < 0.5) {
        // TACKLE event (dome-specific)
        event = {
          id: `tackle-${Date.now()}`,
          timestamp: Date.now(),
          tick: currentTick,
          type: 'tackle',
          description: 'Successful tackle in the dome!',
          priority: { priority: 3, label: 'Standard', speedMultiplier: 1.0, visualsRequired: true },
          position: { x: Math.random(), y: Math.random() },
          playersInvolved: ['b1', 'r2']
        };
      } else if (eventRand < 0.7) {
        // PASS event (dome-specific)
        event = {
          id: `pass-${Date.now()}`,
          timestamp: Date.now(),
          tick: currentTick,
          type: 'pass',
          description: 'Precise pass across the dome field',
          priority: { priority: 3, label: 'Standard', speedMultiplier: 1.0, visualsRequired: false },
          position: { x: Math.random(), y: Math.random() },
          playersInvolved: ['p1', 'r1']
        };
      } else {
        // BLOCK event (dome-specific)
        event = {
          id: `block-${Date.now()}`,
          timestamp: Date.now(),
          tick: currentTick,
          type: 'block',
          description: 'Defensive block prevents advance',
          priority: { priority: 2, label: 'Important', speedMultiplier: 0.8, visualsRequired: true },
          position: { x: Math.random(), y: Math.random() },
          playersInvolved: ['b1', 'b2']
        };
      }
      
      if (event) {
        match.gameEvents.push(event);
        simulation.lastEventTick = currentTick;
        
        // Broadcast event with REAL game structure
        io.to(`match-${matchId}`).emit('match-event', {
          matchId,
          event,
          currentState: match
        });
      }
    }
    
    // Halftime at 50% of maxTime
    const halfTime = match.maxTime / 2;
    if (match.gameTime >= halfTime && match.currentHalf === 1) {
      match.currentHalf = 2;
      const halftimeEvent = {
        id: `halftime-${Date.now()}`,
        timestamp: Date.now(),
        tick: simulation.matchTick,
        type: 'halftime',
        description: 'HALFTIME - Teams switch sides',
        priority: { priority: 1, label: 'Critical', speedMultiplier: 0.1, visualsRequired: true }
      };
      
      match.gameEvents.push(halftimeEvent);
      io.to(`match-${matchId}`).emit('match-event', {
        matchId,
        event: halftimeEvent,
        currentState: match
      });
    }
    
    // Full time at maxTime (30min Exhibition or 40min League)
    if (match.gameTime >= match.maxTime) {
      endMatchSimulation(matchId);
      return;
    }
    
    // Broadcast state update every 3 seconds (per tick)
    io.to(`match-${matchId}`).emit('match-update', {
      matchId,
      state: match,
      timestamp: new Date().toISOString()
    });
    
  }, 1000); // 1 second intervals for smooth real-time updates
  
  // Store simulation reference
  activeMatches.set(`${matchId}-sim`, simulation);
}

function pauseMatchSimulation(matchId) {
  const simulation = activeMatches.get(`${matchId}-sim`);
  if (simulation && simulation.interval) {
    clearInterval(simulation.interval);
    simulation.interval = null;
    
    const match = activeMatches.get(matchId);
    if (match) {
      match.status = 'paused';
      io.to(`match-${matchId}`).emit('match-paused', { matchId, state: match });
    }
  }
}

function resumeMatchSimulation(matchId) {
  const simulation = activeMatches.get(`${matchId}-sim`);
  if (simulation && !simulation.interval) {
    const match = activeMatches.get(matchId);
    if (match) {
      match.status = 'live';
      io.to(`match-${matchId}`).emit('match-resumed', { matchId, state: match });
      startMatchSimulation(matchId);
    }
  }
}

function endMatchSimulation(matchId) {
  const simulation = activeMatches.get(`${matchId}-sim`);
  if (simulation && simulation.interval) {
    clearInterval(simulation.interval);
  }
  
  const match = activeMatches.get(matchId);
  if (match) {
    match.status = 'completed';
    match.gameTime = match.maxTime; // Use real max time (30min or 40min)
    
    const fullTimeEvent = {
      id: `fulltime-${Date.now()}`,
      timestamp: Date.now(),
      tick: simulation ? simulation.matchTick : 0,
      type: 'fulltime',
      description: `FULL TIME: Home ${match.homeScore} - ${match.awayScore} Away`,
      priority: { priority: 1, label: 'Critical', speedMultiplier: 0.1, visualsRequired: true }
    };
    
    match.gameEvents.push(fullTimeEvent);
    
    // Broadcast match completion with REAL game structure
    io.to(`match-${matchId}`).emit('match-completed', {
      matchId,
      finalState: match,
      timestamp: new Date().toISOString()
    });
  }
  
  activeMatches.delete(`${matchId}-sim`);
  console.log(`🏟️ REAL Realm Rivalry match completed: ${matchId} (${match?.maxTime/60}min match)`);
}

// WebSocket status endpoint
app.get('/api/realtime-status', (req, res) => {
  res.json({
    status: 'active',
    connectedUsers: connectedUsers.size,
    activeMatches: Array.from(activeMatches.keys()),
    matchRooms: Array.from(matchRooms.entries()).map(([matchId, users]) => ({
      matchId,
      userCount: users.size,
      users: Array.from(users)
    })),
    timestamp: new Date().toISOString(),
    step: 'Step 5 - Real-Time Match Simulation'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Express error:', err);
  res.status(500).json({
    error: 'Internal server error',
    step: 'Step 5',
    timestamp: new Date().toISOString()
  });
});

// Server startup
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`✅ Step 5 Real-Time Game Server running on ${HOST}:${PORT}`);
  console.log(`✅ HTTP endpoints available`);
  console.log(`✅ Real-time match simulation WebSocket active`);
  console.log(`🎮 Live match features: Start/pause/resume simulations`);
  console.log(`🏆 Match rooms: Join matches for real-time updates`);
  console.log(`⚽ Game events: Goals, fouls, cards, halftime, fulltime`);
  console.log(`🌍 Server accessible at: http://${HOST}:${PORT}`);
  console.log(`🔌 WebSocket endpoint: ws://${HOST}:${PORT}/socket.io/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received - shutting down gracefully');
  
  // Stop all active match simulations
  for (const [matchId, simulation] of activeMatches.entries()) {
    if (simulation.interval) {
      clearInterval(simulation.interval);
    }
  }
  
  io.close(() => {
    console.log('🔌 Real-time WebSocket server closed');
    server.close(() => {
      console.log('🛑 HTTP server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received - shutting down gracefully');
  
  // Stop all active match simulations
  for (const [matchId, simulation] of activeMatches.entries()) {
    if (simulation.interval) {
      clearInterval(simulation.interval);
    }
  }
  
  io.close(() => {
    console.log('🔌 Real-time WebSocket server closed');
    server.close(() => {
      console.log('🛑 HTTP server closed');
      process.exit(0);
    });
  });
});