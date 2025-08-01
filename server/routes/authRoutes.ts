import { Router, type Response, type NextFunction } from "express"; // Added Response, NextFunction
import { userStorage } from "../storage/userStorage"; // Updated import
import { isAuthenticated } from "../googleAuth";
import { RBACService, Permission } from "../services/rbacService";
import passport from 'passport';

const router = Router();

// ✅ LOGIN - Initiate Google OAuth
router.get('/login', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

// ✅ GOOGLE OAUTH CALLBACK
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    console.log('✅ OAuth callback successful, redirecting to homepage');
    res.redirect('/'); // Redirect home after successful login
  }
);

// ✅ LOGOUT ENDPOINT
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Logout failed' });  
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ message: 'Session cleanup failed' });
      }
      res.clearCookie('connect.sid'); // Clear session cookie
      return res.json({ message: 'Logged out successfully' });
    });
  });
});

// ✅ GET USER STATUS - NO middleware, handle auth check internally
router.get('/user', async (req: any, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      // Return success response with authenticated: false
      return res.json({ authenticated: false, user: null });
    }

    // User is authenticated, get user data
    const hardcodedUserId = "44010914"; // Temporary for development
    let user = await userStorage.getUser(hardcodedUserId);
    
    // Create development user if doesn't exist
    if (!user) {
      console.log('Creating development user profile...');
      user = await userStorage.upsertUser({
        userId: hardcodedUserId,
        email: "jimmy058910@gmail.com",
        firstName: "Jimmy",
        lastName: "Dev"
      });
      
      // Auto-accept NDA for development user
      user = await userStorage.acceptNDA(hardcodedUserId, "1.0");
      console.log('Development user created and NDA accepted');
    }

    // Auto-promote specific users to admin for development
    const adminEmails = ['jimmy058910@gmail.com'];
    if (user.email && adminEmails.includes(user.email)) {
      console.log(`Auto-promoting ${user.email} to admin for development`);
      await RBACService.promoteToAdmin(user.email);
    }

    // Return success response with user data
    return res.json({ authenticated: true, user });
  } catch (error) {
    console.error('Auth user endpoint error:', error);
    return res.json({ authenticated: false, user: null });
  }
});

// Check if user has admin access
router.get('/admin-status', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    // Handle different authentication structures
    const userId = req.user?.userId || req.user?.claims?.sub || "44010914"; // fallback for development
    
    if (!userId) {
      return res.json({ 
        isAdmin: false,
        hasAdminAccess: false,
        error: 'No user ID found'
      });
    }
    
    // Use the correct RBAC methods
    const userRole = await RBACService.getUserRole(userId);
    const hasAdminAccess = await RBACService.hasPermission(userId, Permission.GRANT_CREDITS);
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    
    return res.json({ 
      isAdmin,
      hasAdminAccess,
      userRole,
      userId: userId.substring(0, 5) + '***' // Partial for security
    });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return res.json({ 
      isAdmin: false,
      hasAdminAccess: false,
      error: String(error)
    });
  }
});

// Promote self to admin (for testing/setup purposes)
router.post('/promote-to-admin', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.userId;
    const user = await userStorage.getUser(userId);
    
    if (!user || !user.email) {
      return res.status(404).json({ message: "User not found or missing email" });
    }

    // Use the RBAC service to promote user to admin
    await RBACService.promoteToAdmin(user.email);
    
    res.json({ 
      success: true, 
      message: `User ${user.email} has been promoted to admin status. You can now access SuperUser functions.`,
      role: 'admin'
    });
  } catch (error) {
    console.error("Error promoting user to admin:", error);
    return res.status(500).json({ message: "Failed to promote user", error: String(error) });
  }
});

// Development bypass endpoint for testing
router.get("/dev-login", (req: any, res) => {
  // Mock authentication for development
  req.user = {
    claims: {
      sub: "44010914",
      email: "jimmy058910@gmail.com",
      first_name: "Jimmy",
      last_name: "Moceri"
    },
    expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  };
  
  res.json({
    user: req.user.claims,
    authenticated: true,
    note: "Development authentication bypass"
  });
});

// ✅ LOGOUT 
router.get('/logout', (req: any, res: Response, next: NextFunction) => {
  req.logout((err: any) => {
    if (err) { 
      console.error('Logout error:', err);
      return next(err); 
    }
    res.redirect('/');
  });
});

// ✅ SIMPLE USER CHECK (for /api/me compatibility)
router.get('/me', isAuthenticated, (req: any, res: Response) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: 'You are not authenticated' });
  }
});

export default router;
