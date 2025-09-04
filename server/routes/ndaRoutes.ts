import { Router, type Response, type NextFunction, type Request } from "express";
import { userStorage } from '../storage/userStorage.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { asyncHandler } from '../services/errorService.js';
import { getPrismaClient } from "../database.js";

const router = Router();

// Accept NDA
router.post('/accept', requireAuth, asyncHandler(async (req: any, res: Response) => {
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
router.get('/status', requireAuth, asyncHandler(async (req: any, res: Response) => {
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

// Get NDA status and details for a specific user
router.get('/status/:userId', asyncHandler(async (req: any, res: Response) => {
  const userId = req.params.userId;
  
  try {
    const user = await userStorage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      success: true,
      userId: user.userId,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      ndaStatus: {
        accepted: user.ndaAccepted,
        acceptedAt: user.ndaAcceptedAt,
        version: user.ndaVersion,
        accountCreated: user.createdAt
      }
    });
    
  } catch (error) {
    console.error("Error retrieving NDA status:", error);
    return res.status(500).json({ message: "Failed to retrieve NDA status" });
  }
}));

// Get all users who have accepted NDAs (admin endpoint)
router.get('/accepted-users', asyncHandler(async (req: any, res: Response) => {
  try {
    const prisma = await getPrismaClient();
    const users = await prisma.userProfile.findMany({
      where: { ndaAccepted: true },
      select: {
        id: true,
        userId: true,
        email: true,
        firstName: true,
        lastName: true,
        ndaAccepted: true,
        ndaAcceptedAt: true,
        ndaVersion: true,
        createdAt: true,
        Team: {
          select: {
            name: true,
            createdAt: true
          }
        }
      },
      orderBy: { ndaAcceptedAt: 'desc' }
    });
    
    const formattedUsers = users.map((user: any) => ({
      userId: user.userId,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      teamName: user.Team?.name || 'No team',
      ndaAcceptedAt: user.ndaAcceptedAt,
      ndaVersion: user.ndaVersion,
      accountCreated: user.createdAt,
      teamCreated: user.Team?.createdAt || null
    }));
    
    res.json({
      success: true,
      totalUsers: users.length,
      users: formattedUsers
    });
    
  } catch (error) {
    console.error("Error retrieving NDA accepted users:", error);
    return res.status(500).json({ message: "Failed to retrieve NDA accepted users" });
  }
}));

// Get the current NDA text/content (version-specific)
router.get('/content/:version?', asyncHandler(async (req: any, res: Response) => {
  const version = req.params.version || "1.0";
  
  // NDA content storage - in production this might come from a database or file system
  const ndaContent = {
    "1.0": {
      version: "1.0",
      title: "Realm Rivalry Pre-Alpha Non-Disclosure Agreement",
      content: `
        CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT
        
        This Agreement is entered into between you ("Tester") and Realm Rivalry ("Company") 
        regarding access to the pre-alpha version of Realm Rivalry fantasy sports game.
        
        1. CONFIDENTIAL INFORMATION
        You acknowledge that all information related to the game, including but not limited to
        - Game mechanics, features, and functionality
        - User interface designs and layouts
        - Performance data and analytics
        - Business strategies and future plans
        - Any bugs, issues, or development discussions
        
        2. NON-DISCLOSURE OBLIGATIONS  
        You agree to
        - Keep all information strictly confidential
        - Not share screenshots, videos, or descriptions publicly
        - Not discuss the game on social media or forums
        - Report issues only through official channels
        
        3. TESTING PURPOSE
        Access is granted solely for testing and feedback purposes.
        
        4. TERMINATION
        This agreement remains in effect until the game's public release or termination of your access.
        
        By accepting this agreement, you acknowledge understanding and agreement to these terms.
      `,
      effectiveDate: "2025-01-01",
      lastModified: "2025-08-05"
    }
  };
  
  const nda = ndaContent[version as keyof typeof ndaContent];
  
  if (!nda) {
    return res.status(404).json({ message: `NDA version ${version} not found` });
  }
  
  res.json({
    success: true,
    nda: nda
  });
}));

export default router;