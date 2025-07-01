import { Router, type Response, type NextFunction } from "express"; // Added Response, NextFunction
import { userStorage } from "../storage/userStorage"; // Updated import
import { isAuthenticated } from "../replitAuth";
import { RBACService } from "../services/rbacService";

const router = Router();

// Auth routes
router.get('/user', isAuthenticated, async (req: any, res: Response, next: NextFunction) => { // Added next
  try {
    const userId = req.user.claims.sub;
    const user = await userStorage.getUser(userId); // Use userStorage
    if (!user) {
      // Send 404 if user is not found, consistent with other routes
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    // Pass error to global error handler
    next(error);
  }
});

// Promote self to admin (for testing/setup purposes)
router.post('/promote-to-admin', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const user = await userStorage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
    next(error);
  }
});

export default router;
