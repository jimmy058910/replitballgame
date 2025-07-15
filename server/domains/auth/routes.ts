import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from './service';
import { authSchemas } from './schemas';
import { validateRequest } from '../core/validation';
import { requireAuth } from './middleware';

const router = Router();

// Get current user profile
router.get('/user',
  requireAuth,
  async (req, res, next) => {
    try {
      const profile = await AuthService.getUserProfile(req.user.userId);
      
      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update user profile
router.put('/user',
  requireAuth,
  validateRequest({
    body: z.object({
      username: z.string().min(3).max(20).optional(),
      avatar: z.string().url().optional()
    })
  }),
  async (req, res, next) => {
    try {
      const profile = await AuthService.updateUserProfile(req.user.userId, req.body);
      
      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }
);

// Health check for auth domain
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'auth',
    timestamp: new Date().toISOString()
  });
});

export default router;