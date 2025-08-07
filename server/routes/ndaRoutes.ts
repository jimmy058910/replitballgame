import { Router, type Response, type NextFunction } from "express";
import { userStorage } from "../storage/userStorage";
import { isAuthenticated } from "../googleAuth";
import { asyncHandler } from "../services/errorService";

const router = Router();

// Accept NDA
router.post('/accept', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  const { ndaVersion = "1.0" } = req.body;
  
  try {
    const user = await userStorage.acceptNDA(userId, ndaVersion);
    res.json({ 
      success: true, 
      message: "NDA accepted successfully",
      user: {
        ndaAccepted: user.ndaAccepted,
        ndaAcceptedAt: user.ndaAcceptedAt,
        ndaVersion: user.ndaVersion
      }
    });
  } catch (error) {
    console.error("Error accepting NDA:", error);
    res.status(500).json({ message: "Failed to accept NDA" });
  }
}));

// Check NDA status
router.get('/status', isAuthenticated, asyncHandler(async (req: any, res: Response) => {
  const userId = req.user.claims.sub;
  
  try {
    const ndaAccepted = await userStorage.checkNDAAcceptance(userId);
    res.json({ 
      ndaAccepted,
      required: true // Always required for pre-alpha
    });
  } catch (error) {
    console.error("Error checking NDA status:", error);
    res.status(500).json({ message: "Failed to check NDA status" });
  }
}));

export default router;