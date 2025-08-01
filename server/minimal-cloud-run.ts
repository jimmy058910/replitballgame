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

// Team creation state tracking
let hasTeam: boolean = false;
let createdTeam: any = null;

// Team endpoints - provide basic responses with 200 status
app.get('/api/teams/my', (req, res) => {
  if (hasTeam && createdTeam) {
    return res.status(200).json(createdTeam);
  }
  return res.status(200).json({ 
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

// Team creation endpoint
app.post('/api/teams/create', (req, res) => {
  const { teamName, ndaAgreed } = req.body;
  
  if (!teamName || !ndaAgreed) {
    return res.status(400).json({ 
      error: 'Team name and NDA agreement required' 
    });
  }

  if (teamName.length > 25) {
    return res.status(400).json({ 
      error: 'Team name must be 25 characters or less' 
    });
  }

  // Create team and update global state
  const newTeam = {
    id: 'team_' + Date.now(),
    name: teamName,
    division: 8,
    subdivision: 'late_alpha',
    wins: 0,
    losses: 0,
    points: 0,
    camaraderie: 50,
    fanLoyalty: 30,
    credits: 5000,
    gems: 0
  };

  hasTeam = true;
  createdTeam = newTeam;

  return res.status(201).json({
    message: 'Dynasty created successfully!',
    team: newTeam,
    needsTeamCreation: false
  });
});

// Store endpoints for MarketDistrict
app.get('/api/store/items', (req, res) => {
  res.status(200).json({
    items: [
      {
        id: 'energy_drink',
        name: 'Energy Drink',
        description: 'Restores 25 stamina instantly',
        credits: 100,
        tier: 'common',
        category: 'consumable',
        purchased: 0,
        dailyLimit: 5,
        canPurchase: true,
        effect: 'stamina_boost'
      },
      {
        id: 'training_gear',
        name: 'Training Gear',
        description: 'Improves training effectiveness',
        credits: 500,
        gems: 2,
        tier: 'rare',
        category: 'equipment',
        purchased: 0,
        dailyLimit: 1,
        canPurchase: true,
        statEffects: { strength: 2, speed: 1 }
      }
    ]
  });
});

app.get('/api/store/gem-packages', (req, res) => {
  res.status(200).json({
    gemPackages: [
      { gems: 10, credits: 4000, popular: false },
      { gems: 25, credits: 10000, popular: true },
      { gems: 50, credits: 20000, popular: false },
      { gems: 100, credits: 40000, popular: false }
    ]
  });
});

app.get('/api/teams/transactions', (req, res) => {
  res.status(200).json({
    transactions: []
  });
});

app.post('/api/store/exchange-gems', (req, res) => {
  const { gemAmount } = req.body;
  res.status(200).json({
    success: true,
    message: `Exchanged ${gemAmount} gems for ${gemAmount * 400} credits`,
    newBalance: { credits: gemAmount * 400, gems: 0 }
  });
});

app.post('/api/store/purchase/exhibition_credit', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Exhibition credit purchased successfully'
  });
});

// World rankings endpoint removed - using real worldRoutes.ts implementation

// Global rankings endpoint removed - using real worldRoutes.ts implementation

// Competition Center endpoints
app.get('/api/league/standings', (req, res) => {
  res.status(200).json({
    standings: [
      {
        division: 1,
        teams: [
          { id: 'team_1', name: 'Elite Dragons', wins: 12, losses: 1, points: 36 }
        ]
      }
    ]
  });
});

app.get('/api/matches/schedule', (req, res) => {
  res.status(200).json({
    upcomingMatches: [],
    recentMatches: []
  });
});

app.get('/api/tournaments/current', (req, res) => {
  res.status(200).json({
    tournaments: []
  });
});

// Exhibition endpoints 
app.get('/api/exhibitions/stats', (req, res) => {
  res.status(200).json({
    totalExhibitions: 0,
    wins: 0,
    losses: 0,
    freeGamesRemaining: 3,
    extraTokens: 0
  });
});

app.get('/api/exhibitions/recent', (req, res) => {
  res.status(200).json([]);
});

app.get('/api/exhibitions/available-opponents', (req, res) => {
  res.status(200).json([
    { id: 1, name: 'Storm Riders', division: 2, difficulty: 'medium' },
    { id: 2, name: 'Thunder Hawks', division: 3, difficulty: 'easy' }
  ]);
});

// Hall of Fame removed - no real backend implementation

// Gem packages endpoint for market store
app.get('/api/store/gem-packages', (req, res) => {
  res.status(200).json([
    {
      id: 'small_gem_pack',
      name: 'Small Gem Pack',
      description: '100 Gems for quick purchases',
      gems: 100,
      price: 4.99,
      currency: 'USD',
      popular: false
    },
    {
      id: 'medium_gem_pack', 
      name: 'Medium Gem Pack',
      description: '350 Gems + 50 bonus gems',
      gems: 400,
      price: 14.99,
      currency: 'USD',
      popular: true
    },
    {
      id: 'large_gem_pack',
      name: 'Large Gem Pack', 
      description: '750 Gems + 150 bonus gems',
      gems: 900,
      price: 29.99,
      currency: 'USD',
      popular: false
    }
  ]);
});

// Essential endpoints commonly used
app.get('/api/camaraderie/summary', (req, res) => {
  res.status(200).json({
    teamCamaraderie: 65,
    status: 'good'
  });
});

app.get('/api/season/current-cycle', (req, res) => {
  res.status(200).json({
    seasonNumber: 1,
    currentDay: 5,
    startDate: '2025-01-01',
    totalDays: 17
  });
});

app.get('/api/teams/my/next-opponent', (req, res) => {
  res.status(200).json({
    nextOpponent: 'Storm Riders',
    gameDate: '2025-08-02',
    isHome: true,
    matchType: 'league',
    division: 2,
    timeUntil: '1 day'
  });
});

// World statistics endpoint removed - using real worldRoutes.ts implementation

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