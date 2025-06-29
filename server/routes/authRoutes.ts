import { Router, type Response, type NextFunction } from "express"; // Added Response, NextFunction
import { userStorage } from "../storage/userStorage"; // Updated import
import { isAuthenticated } from "../replitAuth";

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

export default router;
