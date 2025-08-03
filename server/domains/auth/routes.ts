import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../core/validation';
import { commonSchemas } from '../core/validation';
import { Logger } from '../core/logger';
import { requireAuth } from './middleware';

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
        id: user.id,
        userId: user.userId,
        email: user.email,
        username: user.username,
        teamId: user.teamId
      }
    });
  } catch (error) {
    Logger.error('Failed to get user profile', { error: error.message });
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

router.put('/user', requireAuth, validateRequest(updateProfileSchema), (req, res) => {
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
    Logger.error('Failed to update user profile', { error: error.message });
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
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

export default router;