/**
 * Test Setup Configuration
 * Global test setup and mocking configuration
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/realm_rivalry_test';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    // Mock all Prisma models
    team: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    player: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    game: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tournament: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tournamentEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userProfile: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    season: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    league: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    teamFinance: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    strategy: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// Mock WebSocket service
jest.mock('../server/services/webSocketService', () => ({
  broadcast: jest.fn(),
  broadcastToUser: jest.fn(),
  initialize: jest.fn(),
}));

// Mock error service
jest.mock('../server/services/errorService', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

// Mock authentication
jest.mock('../server/replitAuth', () => ({
  isAuthenticated: jest.fn((req, res, next) => {
    req.user = { id: 'test-user', userId: 'test-user-id' };
    next();
  }),
}));

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 'test-user',
    userId: 'test-user-id',
    email: 'test@example.com',
    ...overrides,
  }),
  
  createMockTeam: (overrides = {}) => ({
    id: 'test-team',
    name: 'Test Team',
    userProfileId: 'test-user',
    division: 8,
    subdivision: 'eta',
    wins: 0,
    losses: 0,
    draws: 0,
    ...overrides,
  }),

  createMockPlayer: (overrides = {}) => ({
    id: 'test-player',
    firstName: 'Test',
    lastName: 'Player',
    race: 'HUMAN',
    role: 'RUNNER',
    age: 25,
    speed: 20,
    power: 25,
    agility: 18,
    throwing: 15,
    catching: 22,
    kicking: 12,
    stamina: 28,
    leadership: 16,
    potentialRating: 3.5,
    teamId: 'test-team',
    isRetired: false,
    ...overrides,
  }),

  createMockMatch: (overrides = {}) => ({
    id: 'test-match',
    homeTeamId: 'test-team-1',
    awayTeamId: 'test-team-2',
    gameDate: new Date(),
    matchType: 'LEAGUE',
    status: 'SCHEDULED',
    homeScore: 0,
    awayScore: 0,
    ...overrides,
  }),

  createMockTournament: (overrides = {}) => ({
    id: 'test-tournament',
    name: 'Test Tournament',
    type: 'DAILY_DIVISION',
    status: 'REGISTRATION',
    maxParticipants: 8,
    prizePool: 50000,
    startTime: new Date(),
    division: 8,
    seasonDay: 7,
    ...overrides,
  }),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

console.log('✓ Test setup complete - All mocks initialized');