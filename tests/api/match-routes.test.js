/**
 * Match Routes API Tests
 * Tests all match-related API endpoints
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../server/index');

jest.mock('../../server/replitAuth', () => ({
  isAuthenticated: (req, res, next) => {
    req.user = { id: 'test-user', userId: 'test-user-id' };
    next();
  },
}));

describe('Match Routes API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/matches/live', () => {
    it('should return live matches', async () => {
      const response = await request(app)
        .get('/api/matches/live')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.every(match => match.status === 'IN_PROGRESS')).toBe(true);
    });
  });

  describe('GET /api/matches/:matchId/enhanced-data', () => {
    it('should return enhanced match data', async () => {
      const response = await request(app)
        .get('/api/matches/test-match/enhanced-data')
        .expect(200);

      expect(response.body).toHaveProperty('mvpData');
      expect(response.body).toHaveProperty('teamStats');
      expect(response.body).toHaveProperty('events');
    });
  });

  describe('POST /api/matches/:matchId/force-start', () => {
    it('should force start a match', async () => {
      const response = await request(app)
        .post('/api/matches/test-match/force-start')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });
  });
});

module.exports = {};