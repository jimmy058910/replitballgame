import { Router } from 'express.js';
import { z } from 'zod.js';
import { validateRequest } from '../core/validation.js';
import { commonSchemas } from '../core/validation.js';
import { Logger } from '../core/logger.js';
import { requireAuth } from './middleware.js';

const router = Router();

// Health check endpoint removed - using main enhanced health endpoint in server/index.ts

// Get current user profile (protected)
router.get('/user', requireAuth, (req, res) => {
  try {
    // User is available from requireAuth middleware
    const user = req.user;
    
    res.json({
      success: true,
      data: {
        user: user
      }
    });
  } catch (error) {
    Logger.logError('Failed to get user profile', error as Error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user profile (protected)
const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(1).max(50).optional(),
    avatar: z.string().url().optional()
  })
});

router.put('/user', requireAuth, (req, res) => {
  try {
    const { username, avatar } = req.body;
    
    // In a real implementation, this would update the user in the database
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        username,
        avatar
      }
    });
  } catch (error) {
    Logger.logError('Failed to update user profile', error as Error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Demo endpoint to show authentication in action (public)
router.get('/demo/public', (req, res) => {
  res.json({
    success: true,
    message: 'This is a public endpoint - no authentication required',
    timestamp: new Date().toISOString(),
    authenticated: !!req.user
  });
});

// Demo endpoint to show authentication in action (protected)
router.get('/demo/protected', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'This is a protected endpoint - authentication required',
    timestamp: new Date().toISOString(),
    user: req.user
  });
});

export default router;