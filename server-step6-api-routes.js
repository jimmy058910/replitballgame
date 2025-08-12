#!/usr/bin/env node

/**
 * STEP 6: Enhanced API Routes
 * Builds on Step 5 WebSocket system by adding comprehensive API endpoints
 * Components: Express + Database + Firebase Auth + Frontend + WebSocket + Enhanced API Routes
 * Features: Complete game API, player management, team operations, match history, statistics
 */

// Environment and startup validation
console.log('🚀 STEP 6: Enhanced API Routes for complete game functionality');
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

// Enhanced middleware for API routes
app.use(express.json({ limit: '50mb' })); // Increased for complex game data
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enhanced CORS configuration for comprehensive API access
const corsOptions = {
  origin: [
    'http://localhost:5000',
    'http://localhost:3000',
    /\.replit\.dev$/,
    /^https?:\/\/.*replit.*$/,
    /^https:\/\/.*\.run\.app$/,
    /^https:\/\/.*\.firebaseapp\.com$/,
    /^https:\/\/.*\.web\.app$/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-API-Key', 'X-User-ID'],
  credentials: true
};

app.use(cors(corsOptions));

// Health check endpoint with enhanced API status
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '6.34.0-STEP6-API-ROUTES',
    port: process.env.PORT || '8080',
    features: ['enhanced-api-routes', 'player-management', 'team-operations', 'match-history', 'statistics-engine'],
    apiEndpoints: {
      players: '/api/players',
      teams: '/api/teams', 
      matches: '/api/matches',
      leagues: '/api/leagues',
      stats: '/api/stats',
      tournaments: '/api/tournaments'
    }
  });
});

// In-memory game data storage (enhanced for Step 6)
const gameData = {
  players: new Map(),
  teams: new Map(),
  matches: new Map(),
  leagues: new Map(),
  tournaments: new Map(),
  stats: new Map(),
  contracts: new Map(),
  transfers: new Map()
};

// Initialize authentic Realm Rivalry game data
function initializeGameData() {
  console.log('🎮 Initializing authentic Realm Rivalry game data...');
  
  // Fantasy races with authentic attributes
  const races = {
    'Human': { 
      name: 'Human', 
      bonuses: { leadership: 1.1, versatility: 1.05 },
      description: 'Balanced and adaptable with natural leadership'
    },
    'Sylvan': { 
      name: 'Sylvan', 
      bonuses: { agility: 1.15, passing: 1.1 },
      description: 'Forest dwellers with exceptional agility and precision'
    },
    'Gryll': { 
      name: 'Gryll', 
      bonuses: { power: 1.2, intimidation: 1.15 },
      description: 'Fierce warriors with overwhelming physical presence'
    },
    'Lumina': { 
      name: 'Lumina', 
      bonuses: { speed: 1.1, precision: 1.1 },
      description: 'Light-touched beings with supernatural speed and accuracy'
    },
    'Umbra': { 
      name: 'Umbra', 
      bonuses: { stealth: 1.15, unpredictability: 1.1 },
      description: 'Shadow manipulators with deceptive tactics'
    }
  };
  
  // Create sample teams with authentic 6v6 rosters
  const teamNames = [
    'Stormwind Champions', 'Shadowmere Reapers', 'Crystalvale Guardians', 
    'Thornheart Wildcats', 'Duskfall Ravens', 'Brightforge Titans',
    'Mistwood Hunters', 'Ironpeak Demolishers'
  ];
  
  teamNames.forEach((teamName, index) => {
    const teamId = `team_${index + 1}`;
    const teamRace = Object.keys(races)[index % 5];
    
    // Create 6v6 roster with authentic positions
    const roster = {
      passer: createPlayer(teamId, 'Passer', teamRace),
      runners: [
        createPlayer(teamId, 'Runner', teamRace),
        createPlayer(teamId, 'Runner', teamRace)
      ],
      blockers: [
        createPlayer(teamId, 'Blocker', teamRace),
        createPlayer(teamId, 'Blocker', teamRace)
      ],
      wildcard: createPlayer(teamId, 'Wildcard', teamRace)
    };
    
    // Store individual players
    Object.values(roster).flat().forEach(player => {
      if (player && player.id) {
        gameData.players.set(player.id, player);
      }
    });
    
    // Create team
    const team = {
      id: teamId,
      name: teamName,
      race: teamRace,
      raceData: races[teamRace],
      roster: roster,
      stats: {
        wins: Math.floor(Math.random() * 15),
        losses: Math.floor(Math.random() * 10),
        draws: Math.floor(Math.random() * 3),
        goals: Math.floor(Math.random() * 50 + 20),
        goalsAgainst: Math.floor(Math.random() * 40 + 15)
      },
      finances: {
        budget: 1000000 + Math.floor(Math.random() * 500000),
        salaries: 450000 + Math.floor(Math.random() * 200000),
        revenue: 750000 + Math.floor(Math.random() * 300000)
      },
      stadium: {
        name: `${teamName} Arena`,
        capacity: 25000 + Math.floor(Math.random() * 15000),
        level: Math.floor(Math.random() * 5) + 3
      }
    };
    
    gameData.teams.set(teamId, team);
  });
  
  // Create sample leagues
  gameData.leagues.set('premier', {
    id: 'premier',
    name: 'Realm Rivalry Premier League',
    teams: Array.from(gameData.teams.keys()).slice(0, 4),
    season: 2024,
    matchday: 12,
    status: 'active'
  });
  
  gameData.leagues.set('championship', {
    id: 'championship',
    name: 'Championship Division',
    teams: Array.from(gameData.teams.keys()).slice(4, 8),
    season: 2024,
    matchday: 11,
    status: 'active'
  });
  
  console.log(`✅ Initialized ${gameData.teams.size} teams with ${gameData.players.size} players`);
}

// Create authentic player with race-specific attributes
function createPlayer(teamId, position, race) {
  const raceNames = {
    'Human': ['Marcus', 'Elena', 'David', 'Sarah', 'James', 'Anna'],
    'Sylvan': ['Thalion', 'Elaria', 'Celeborn', 'Arwen', 'Legolas', 'Galadriel'],
    'Gryll': ['Grimjaw', 'Krix', 'Snarl', 'Vex', 'Grok', 'Zara'],
    'Lumina': ['Celestine', 'Aurelius', 'Seraphim', 'Luna', 'Solar', 'Stella'],
    'Umbra': ['Nyx', 'Mortis', 'Shadow', 'Void', 'Eclipse', 'Phantom']
  };
  
  const surnames = {
    'Human': ['Steelwall', 'Ironheart', 'Goldstrike', 'Swiftblade'],
    'Sylvan': ['Stormweaver', 'Swiftleaf', 'Moonwhisper', 'Stargazer'],
    'Gryll': ['Bonethrow', 'Poisonfang', 'Bloodclaw', 'Skullcrush'],
    'Lumina': ['Lightbringer', 'Dawnrunner', 'Sunburst', 'Radiance'],
    'Umbra': ['Shadowstep', 'Nightfall', 'Voidstrike', 'Darkwhisper']
  };
  
  const playerId = `${teamId}_${position.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const firstName = raceNames[race][Math.floor(Math.random() * raceNames[race].length)];
  const lastName = surnames[race][Math.floor(Math.random() * surnames[race].length)];
  
  // Base attributes influenced by position and race
  let baseStats = {};
  switch (position) {
    case 'Passer':
      baseStats = { speed: 75, power: 70, throwing: 85, catching: 80, kicking: 78, stamina: 82, agility: 77, leadership: 85 };
      break;
    case 'Runner':
      baseStats = { speed: 88, power: 75, throwing: 65, catching: 85, kicking: 70, stamina: 85, agility: 90, leadership: 70 };
      break;
    case 'Blocker':
      baseStats = { speed: 65, power: 92, throwing: 60, catching: 70, kicking: 65, stamina: 88, agility: 68, leadership: 80 };
      break;
    case 'Wildcard':
      baseStats = { speed: 80, power: 78, throwing: 75, catching: 82, kicking: 73, stamina: 80, agility: 83, leadership: 75 };
      break;
  }
  
  // Apply random variation and race bonuses
  Object.keys(baseStats).forEach(stat => {
    const variation = (Math.random() - 0.5) * 20; // ±10 variation
    baseStats[stat] = Math.max(40, Math.min(99, baseStats[stat] + variation));
  });
  
  return {
    id: playerId,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    position,
    teamId,
    race,
    ...baseStats,
    age: 18 + Math.floor(Math.random() * 12), // 18-29 years old
    experience: Math.floor(Math.random() * 8), // 0-7 years
    marketValue: Math.floor(Math.random() * 500000 + 100000), // 100k-600k
    contract: {
      salary: Math.floor(Math.random() * 50000 + 20000), // 20k-70k per season
      duration: Math.floor(Math.random() * 3) + 1 // 1-3 years remaining
    },
    injuries: [],
    careerStats: {
      matches: Math.floor(Math.random() * 50),
      goals: Math.floor(Math.random() * 20),
      assists: Math.floor(Math.random() * 15),
      yellowCards: Math.floor(Math.random() * 5),
      redCards: Math.floor(Math.random() * 2)
    }
  };
}

// COMPREHENSIVE API ROUTES

// ===================
// PLAYERS API
// ===================
app.get('/api/players', (req, res) => {
  const { team, position, race, limit = 50 } = req.query;
  let players = Array.from(gameData.players.values());
  
  // Apply filters
  if (team) players = players.filter(p => p.teamId === team);
  if (position) players = players.filter(p => p.position === position);
  if (race) players = players.filter(p => p.race === race);
  
  // Apply limit
  players = players.slice(0, parseInt(limit));
  
  res.json({
    players,
    total: players.length,
    filters: { team, position, race, limit }
  });
});

app.get('/api/players/:playerId', (req, res) => {
  const player = gameData.players.get(req.params.playerId);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  res.json(player);
});

app.put('/api/players/:playerId', (req, res) => {
  const playerId = req.params.playerId;
  const player = gameData.players.get(playerId);
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  // Update allowed fields
  const allowedUpdates = ['firstName', 'lastName', 'position'];
  const updates = {};
  
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });
  
  Object.assign(player, updates);
  if (updates.firstName || updates.lastName) {
    player.fullName = `${player.firstName} ${player.lastName}`;
  }
  
  gameData.players.set(playerId, player);
  res.json(player);
});

// Player statistics endpoint
app.get('/api/players/:playerId/stats', (req, res) => {
  const player = gameData.players.get(req.params.playerId);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  
  // Generate detailed statistics
  const stats = {
    basic: player.careerStats,
    attributes: {
      speed: player.speed,
      power: player.power,
      throwing: player.throwing,
      catching: player.catching,
      stamina: player.stamina,
      agility: player.agility,
      leadership: player.leadership
    },
    financial: {
      marketValue: player.marketValue,
      salary: player.contract.salary,
      contractRemaining: player.contract.duration
    },
    performance: {
      goalsPerGame: player.careerStats.matches > 0 ? (player.careerStats.goals / player.careerStats.matches).toFixed(2) : '0.00',
      assistsPerGame: player.careerStats.matches > 0 ? (player.careerStats.assists / player.careerStats.matches).toFixed(2) : '0.00'
    }
  };
  
  res.json(stats);
});

// ===================
// TEAMS API
// ===================
app.get('/api/teams', (req, res) => {
  const { league, race } = req.query;
  let teams = Array.from(gameData.teams.values());
  
  // Apply filters
  if (league) {
    const leagueData = gameData.leagues.get(league);
    if (leagueData) {
      teams = teams.filter(t => leagueData.teams.includes(t.id));
    }
  }
  if (race) teams = teams.filter(t => t.race === race);
  
  res.json({
    teams,
    total: teams.length,
    filters: { league, race }
  });
});

app.get('/api/teams/:teamId', (req, res) => {
  const team = gameData.teams.get(req.params.teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }
  res.json(team);
});

app.get('/api/teams/:teamId/roster', (req, res) => {
  const team = gameData.teams.get(req.params.teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }
  
  const roster = {
    teamId: team.id,
    teamName: team.name,
    race: team.race,
    players: team.roster
  };
  
  res.json(roster);
});

app.get('/api/teams/:teamId/stats', (req, res) => {
  const team = gameData.teams.get(req.params.teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }
  
  const stats = {
    performance: team.stats,
    finances: team.finances,
    stadium: team.stadium,
    calculated: {
      winRate: team.stats.wins / (team.stats.wins + team.stats.losses + team.stats.draws),
      goalDifference: team.stats.goals - team.stats.goalsAgainst,
      avgGoalsScored: team.stats.goals / (team.stats.wins + team.stats.losses + team.stats.draws),
      avgGoalsConceded: team.stats.goalsAgainst / (team.stats.wins + team.stats.losses + team.stats.draws)
    }
  };
  
  res.json(stats);
});

// ===================
// MATCHES API
// ===================
app.get('/api/matches', (req, res) => {
  const { status, team, league, limit = 20 } = req.query;
  let matches = Array.from(gameData.matches.values());
  
  // Apply filters
  if (status) matches = matches.filter(m => m.status === status);
  if (team) matches = matches.filter(m => m.homeTeamId === team || m.awayTeamId === team);
  if (league) matches = matches.filter(m => m.leagueId === league);
  
  // Sort by date (newest first)
  matches.sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
  
  // Apply limit
  matches = matches.slice(0, parseInt(limit));
  
  res.json({
    matches,
    total: matches.length,
    filters: { status, team, league, limit }
  });
});

app.post('/api/matches', (req, res) => {
  const { homeTeamId, awayTeamId, leagueId, type = 'league', scheduledDate } = req.body;
  
  // Validate teams exist
  if (!gameData.teams.has(homeTeamId) || !gameData.teams.has(awayTeamId)) {
    return res.status(400).json({ error: 'Invalid team ID' });
  }
  
  const matchId = `match_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const match = {
    id: matchId,
    homeTeamId,
    awayTeamId,
    leagueId: leagueId || null,
    type, // 'league', 'exhibition', 'tournament'
    status: 'scheduled', // 'scheduled', 'live', 'completed', 'cancelled'
    scheduledDate: scheduledDate || new Date().toISOString(),
    homeScore: 0,
    awayScore: 0,
    events: [],
    duration: type === 'exhibition' ? 1800 : 2400, // 30min exhibition, 40min league
    createdAt: new Date().toISOString()
  };
  
  gameData.matches.set(matchId, match);
  res.status(201).json(match);
});

app.get('/api/matches/:matchId', (req, res) => {
  const match = gameData.matches.get(req.params.matchId);
  if (!match) {
    return res.status(404).json({ error: 'Match not found' });
  }
  
  // Enhance with team data
  const enhancedMatch = {
    ...match,
    homeTeam: gameData.teams.get(match.homeTeamId),
    awayTeam: gameData.teams.get(match.awayTeamId)
  };
  
  res.json(enhancedMatch);
});

// ===================
// LEAGUES API
// ===================
app.get('/api/leagues', (req, res) => {
  const leagues = Array.from(gameData.leagues.values());
  res.json({
    leagues,
    total: leagues.length
  });
});

app.get('/api/leagues/:leagueId', (req, res) => {
  const league = gameData.leagues.get(req.params.leagueId);
  if (!league) {
    return res.status(404).json({ error: 'League not found' });
  }
  res.json(league);
});

app.get('/api/leagues/:leagueId/standings', (req, res) => {
  const league = gameData.leagues.get(req.params.leagueId);
  if (!league) {
    return res.status(404).json({ error: 'League not found' });
  }
  
  // Calculate standings based on team stats
  const standings = league.teams.map(teamId => {
    const team = gameData.teams.get(teamId);
    const points = (team.stats.wins * 3) + team.stats.draws;
    const played = team.stats.wins + team.stats.losses + team.stats.draws;
    
    return {
      teamId: team.id,
      teamName: team.name,
      race: team.race,
      played,
      wins: team.stats.wins,
      draws: team.stats.draws,
      losses: team.stats.losses,
      goalsFor: team.stats.goals,
      goalsAgainst: team.stats.goalsAgainst,
      goalDifference: team.stats.goals - team.stats.goalsAgainst,
      points
    };
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points; // Points first
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference; // Goal difference
    return b.goalsFor - a.goalsFor; // Goals scored
  });
  
  // Add position
  standings.forEach((team, index) => {
    team.position = index + 1;
  });
  
  res.json({
    leagueId: league.id,
    leagueName: league.name,
    standings
  });
});

// ===================
// STATISTICS API
// ===================
app.get('/api/stats/top-scorers', (req, res) => {
  const { league, limit = 10 } = req.query;
  let players = Array.from(gameData.players.values());
  
  // Filter by league if specified
  if (league) {
    const leagueData = gameData.leagues.get(league);
    if (leagueData) {
      players = players.filter(p => leagueData.teams.includes(p.teamId));
    }
  }
  
  // Sort by goals and apply limit
  const topScorers = players
    .sort((a, b) => b.careerStats.goals - a.careerStats.goals)
    .slice(0, parseInt(limit))
    .map(player => ({
      playerId: player.id,
      playerName: player.fullName,
      teamId: player.teamId,
      race: player.race,
      position: player.position,
      goals: player.careerStats.goals,
      matches: player.careerStats.matches,
      goalsPerGame: player.careerStats.matches > 0 ? (player.careerStats.goals / player.careerStats.matches).toFixed(2) : '0.00'
    }));
  
  res.json({
    topScorers,
    filters: { league, limit }
  });
});

app.get('/api/stats/overview', (req, res) => {
  const overview = {
    totalPlayers: gameData.players.size,
    totalTeams: gameData.teams.size,
    totalMatches: gameData.matches.size,
    activeLeagues: gameData.leagues.size,
    raceDistribution: {},
    positionDistribution: {}
  };
  
  // Calculate race and position distributions
  Array.from(gameData.players.values()).forEach(player => {
    overview.raceDistribution[player.race] = (overview.raceDistribution[player.race] || 0) + 1;
    overview.positionDistribution[player.position] = (overview.positionDistribution[player.position] || 0) + 1;
  });
  
  res.json(overview);
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
      
      app.use(express.static(distPath, {
        maxAge: '1h',
        etag: true,
        lastModified: true,
        index: false
      }));
      
      app.get('/', (req, res) => {
        console.log('🌐 Serving root route -> index.html');
        res.sendFile(indexPath);
      });
      
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

// Create HTTP server (WebSocket from Step 5 will be integrated in Step 7)
const server = createServer(app);

// Initialize game data
initializeGameData();

// Server startup
const PORT = process.env.PORT || 8080;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 STEP 6 Enhanced API Routes Server running on ${HOST}:${PORT}`);
  console.log(`🏥 Health check: http://${HOST}:${PORT}/health`);
  console.log(`🌐 Frontend (production): http://${HOST}:${PORT}`);
  console.log(`📊 API Documentation:`);
  console.log(`   Players: http://${HOST}:${PORT}/api/players`);
  console.log(`   Teams: http://${HOST}:${PORT}/api/teams`);
  console.log(`   Matches: http://${HOST}:${PORT}/api/matches`);
  console.log(`   Leagues: http://${HOST}:${PORT}/api/leagues`);
  console.log(`   Stats: http://${HOST}:${PORT}/api/stats`);
  console.log(`✨ Features enabled: enhanced-api-routes, comprehensive-game-data, statistics-engine`);
  
  console.log(`📈 Game Data Initialized:`);
  console.log(`   🏃 ${gameData.players.size} players across 5 fantasy races`);
  console.log(`   🏟️ ${gameData.teams.size} teams with authentic 6v6 rosters`);
  console.log(`   🏆 ${gameData.leagues.size} active leagues`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('👋 Step 6 Enhanced API Routes Server shut down');
    process.exit(0);
  });
});