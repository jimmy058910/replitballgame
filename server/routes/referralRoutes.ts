import { Router } from "express";
import { isAuthenticated } from "../googleAuth";
import { storage } from "../storage";

const router = Router();

// Get referral data for the authenticated user
// @ts-expect-error TS7030
router.get("/", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user profile with referral information
    const userProfile = await storage.users.getUser(userId);

    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Get referral statistics
    const referralStats = {
      referralCode: userProfile.referralCode || 'N/A',
      totalReferrals: 0, // Placeholder - would need referral tracking system
      creditsEarned: 0,   // Placeholder - would need referral reward tracking
      recentReferrals: [] // Placeholder - would need referral history tracking
    };

    res.json(referralStats);
  } catch (error) {
    console.error('Error fetching referral data:', error);
    res.status(500).json({ error: 'Failed to fetch referral data' });
  }
});

// Generate or refresh referral code
// @ts-expect-error TS7030
router.post("/generate-code", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Generate a new referral code
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Update user profile with new referral code  
    const updatedProfile = await storage.users.updateUserReferralCode(userId, referralCode);

    if (!updatedProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({ 
      success: true,
      referralCode: referralCode,
      message: 'Referral code generated successfully'
    });
  } catch (error) {
    console.error('Error generating referral code:', error);
    res.status(500).json({ error: 'Failed to generate referral code' });
  }
});

export default router;