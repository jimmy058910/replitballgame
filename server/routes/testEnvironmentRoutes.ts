/**
 * Test Environment API Routes - Industry Standard Testing Infrastructure
 * Provides comprehensive testing endpoints for match simulation engine validation
 */

import { Router } from 'express';
import TestEnvironmentService from '../services/testEnvironmentService';

const router = Router();

/**
 * Create a new test session with generated teams and scenarios
 */
router.post('/sessions', async (req, res) => {
  try {
    const { name, description, teamCount = 8, powerDistribution = 'varied', includeEdgeCases = true } = req.body;
    
    const session = await TestEnvironmentService.createTestSession({
      name: name || `Test Session ${Date.now()}`,
      description: description || 'Automated test session for match engine validation',
      teamCount: Math.min(Math.max(teamCount, 2), 16), // Limit between 2-16 teams
      powerDistribution,
      includeEdgeCases
    });

    res.json({
      success: true,
      session,
      message: `Test session created with ${session.teams.length} teams and ${session.matches.length} match scenarios`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'Failed to create test session'
    });
  }
});

/**
 * Get all test sessions
 */
router.get('/sessions', (req, res) => {
  try {
    const sessions = TestEnvironmentService.getAllTestSessions();
    res.json({
      success: true,
      sessions,
      count: sessions.length
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'Failed to retrieve test sessions'
    });
  }
});

/**
 * Get a specific test session by ID
 */
router.get('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = TestEnvironmentService.getTestSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'Failed to retrieve test session'
    });
  }
});

/**
 * Run a test match and get results
 */
router.post('/sessions/:sessionId/matches/:matchId/run', async (req, res) => {
  try {
    const { sessionId, matchId } = req.params;
    
    const result = await TestEnvironmentService.runTestMatch(sessionId, matchId);
    
    res.json({
      success: true,
      result,
      message: `Test match completed: ${result.homeTeam} ${result.homeScore}-${result.awayScore} ${result.awayTeam}`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'Failed to run test match'
    });
  }
});

/**
 * Get analytics for a test session
 */
router.get('/sessions/:sessionId/analytics', (req, res) => {
  try {
    const { sessionId } = req.params;
    const analytics = TestEnvironmentService.getSessionAnalytics(sessionId);
    
    res.json({
      success: true,
      analytics,
      sessionId
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'Failed to retrieve session analytics'
    });
  }
});

/**
 * Run all matches in a test session (batch processing)
 */
router.post('/sessions/:sessionId/run-all', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = TestEnvironmentService.getTestSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Test session not found'
      });
    }

    const results: Array<any> = [];
    const startTime = Date.now();
    
    for (const match of session.matches) {
      try {
        const result = await TestEnvironmentService.runTestMatch(sessionId, match.id);
        results.push({ ...result, failed: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          matchId: match.id,
          error: errorMessage,
          failed: true
        });
      }
    }
    
    const totalTime = Date.now() - startTime;
    const successfulMatches = results.filter(r => !r.failed).length;
    
    res.json({
      success: true,
      results,
      summary: {
        totalMatches: session.matches.length,
        successfulMatches,
        failedMatches: results.length - successfulMatches,
        totalExecutionTime: totalTime,
        averageMatchTime: totalTime / results.length
      },
      message: `Batch test completed: ${successfulMatches}/${session.matches.length} matches successful`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'Failed to run batch test'
    });
  }
});

/**
 * Clean up old test sessions
 */
router.delete('/sessions/cleanup', (req, res) => {
  try {
    const { olderThanHours = 24 } = req.query;
    TestEnvironmentService.cleanupTestSessions(Number(olderThanHours));
    
    res.json({
      success: true,
      message: `Test sessions older than ${olderThanHours} hours have been cleaned up`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'Failed to cleanup test sessions'
    });
  }
});

/**
 * Get test environment health and status
 */
router.get('/health', (req, res) => {
  try {
    const sessions = TestEnvironmentService.getAllTestSessions();
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    
    res.json({
      success: true,
      status: 'healthy',
      info: {
        totalSessions: sessions.length,
        activeSessions,
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        archivedSessions: sessions.filter(s => s.status === 'archived').length,
        systemUptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      },
      message: 'Test environment is operational'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'Test environment health check failed'
    });
  }
});

export default router;