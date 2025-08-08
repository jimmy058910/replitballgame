import { Router, type Request, type Response, type NextFunction } from "express";
// playerStorage imported via storage index // Updated import
import { storage } from "../storage/index.js"; // Updated import
import { isAuthenticated } from "../googleAuth.js";
import { z } from "zod";
import { ContractService } from "../services/contractService.js";
import { prisma } from "../storage/index.js";

const router = Router();

const contractNegotiationSchema = z.object({
    seasons: z.number().min(1, "Contract must be for at least 1 season.").max(5, "Contract cannot exceed 5 seasons."),
    salary: z.number().min(1000, "Salary must be at least 1000.").max(50000000, "Salary cannot exceed 50,000,000."),
});

/**
 * GET /api/players
 * Get all players for the authenticated user's team
 */
router.get('/', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    
    if (!userTeam) {
      return res.status(404).json({ message: "Your team was not found." });
    }

    const players = await storage.players.getPlayersByTeamId(userTeam.id);
    res.json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    next(error);
  }
});

/**
 * GET /api/players/:playerId
 * Get player details including active contract
 */
router.get('/:playerId', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const player = await storage.players.getPlayerById(parseInt(playerId));
    
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    res.json(player);
  } catch (error) {
    console.error("Error fetching player:", error);
    next(error);
  }
});

/**
 * GET /api/players/:playerId/contract-value
 * Get contract value calculation for a player using Universal Value Formula
 */
router.get('/:playerId/contract-value', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const userId = req.user.claims.sub;
    
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) {
        return res.status(404).json({ message: "Your team was not found." });
    }

    const player = await storage.players.getPlayerById(parseInt(playerId));
    if (!player || player.teamId !== userTeam.id) {
      return res.status(404).json({ message: "Player not found on your team or does not exist." });
    }

    // Get current contract to determine salary
    const currentContract = await prisma.contract.findFirst({
      where: { playerId: parseInt(playerId) }
    });
    
    const contractCalc = ContractService.calculateContractValue(player);
    
    res.json({
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      currentSalary: Number(currentContract?.salary) || 0,
      contractCalc
    });
  } catch (error) {
    console.error("Error calculating contract value:", error);
    next(error);
  }
});

/**
 * POST /api/players/:playerId/negotiate
 * Negotiate a contract with a player using the Universal Value Formula system
 */

/**
 * POST /api/players/:playerId/negotiate
 * Negotiate a contract with a player using the Universal Value Formula system
 */
router.post('/:playerId/negotiate', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const { seasons, salary } = contractNegotiationSchema.parse(req.body);

    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) {
        return res.status(404).json({ message: "Your team was not found." });
    }

    const player = await storage.players.getPlayerById(parseInt(playerId));
    if (!player || player.teamId !== userTeam.id) {
      return res.status(404).json({ message: "Player not found on your team or does not exist." });
    }

    // Use the new UVF-based contract negotiation system
    const negotiationResult = await ContractService.negotiatePlayerContract(parseInt(playerId), salary, seasons);

    if (negotiationResult.accepted) {
      // Update the player's contract
      const updatedPlayer = await ContractService.updatePlayerContract(parseInt(playerId), salary, seasons);
      
      if (!updatedPlayer) {
        return res.status(500).json({ message: "Failed to update player contract details." });
      }

      res.json({
        success: true,
        negotiationResult,
        player: updatedPlayer
      });
    } else {
      res.json({
        success: false,
        negotiationResult
      });
    }
  } catch (error) {
    console.error("Error negotiating contract:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid contract negotiation data.", errors: error.errors });
    }
    next(error);
  }
});

/**
 * GET /api/players/:playerId/contract-negotiation-data
 * Get comprehensive contract negotiation data for redesigned modal
 */
router.get('/:playerId/contract-negotiation-data', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const userId = req.user.claims.sub;
    
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) {
      return res.status(404).json({ message: "Your team was not found." });
    }

    const player = await storage.players.getPlayerById(parseInt(playerId));
    if (!player || player.teamId !== userTeam.id) {
      return res.status(404).json({ message: "Player not found on your team." });
    }

    // Get current contract info
    const currentContract = await prisma.contract.findFirst({
      where: { playerId: parseInt(playerId) }
    });

    // Calculate contract values using existing service
    const contractCalc = ContractService.calculateContractValue(player);
    
    // Mock current season data - replace with actual season logic
    const currentSeason = 0; // This should come from your season management system
    const contractEndsAfterSeason = currentContract ? currentSeason + (currentContract.length || 1) : currentSeason;
    const nextContractStartsSeason = contractEndsAfterSeason + 1;

    // Calculate signing bonus (20% of market value)
    const signingBonus = Math.round(contractCalc.marketValue * 0.2);

    res.json({
      calculation: {
        baseSalary: contractCalc.baseSalary,
        marketValue: contractCalc.marketValue,
        minimumOffer: contractCalc.minimumOffer,
        signingBonus: signingBonus,
        salaryRange: {
          min: contractCalc.minimumOffer,
          max: Math.round(contractCalc.marketValue * 1.5) // 150% of market value as max
        },
        yearsRange: {
          min: 1,
          max: 5
        }
      },
      contractInfo: {
        currentSalary: currentContract?.salary || 0,
        currentYears: currentContract?.length || 0,
        currentSeason: currentSeason,
        contractEndsAfterSeason: contractEndsAfterSeason,
        nextContractStartsSeason: nextContractStartsSeason
      }
    });
  } catch (error) {
    console.error("Error fetching contract negotiation data:", error);
    next(error);
  }
});

/**
 * POST /api/players/:playerId/negotiation-feedback
 * Get live feedback for contract offer (acceptance probability and player response)
 */
router.post('/:playerId/negotiation-feedback', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const { salary, years } = req.body;
    const userId = req.user.claims.sub;
    
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) {
      return res.status(404).json({ message: "Your team was not found." });
    }

    const player = await storage.players.getPlayerById(parseInt(playerId));
    if (!player || player.teamId !== userTeam.id) {
      return res.status(404).json({ message: "Player not found on your team." });
    }

    // Calculate contract values
    const contractCalc = ContractService.calculateContractValue(player);
    
    // Calculate acceptance probability based on offer quality
    const offerValue = salary * years;
    const expectedValue = contractCalc.marketValue * years;
    const offerQuality = offerValue / expectedValue;
    
    // Calculate probability with bonuses/penalties
    let baseProbability = Math.min(100, Math.max(0, (offerQuality - 0.7) * 100));
    
    // Add camaraderie bonus
    const camaraderieBonus = Math.max(0, ((player.camaraderieScore || 50) - 50) * 0.5);
    baseProbability += camaraderieBonus;
    
    // Cap at 95% max probability
    const acceptanceProbability = Math.min(95, Math.round(baseProbability));
    
    // Generate feedback message
    let playerFeedback = "";
    let responseType: 'accepting' | 'considering' | 'demanding' | 'rejecting' = 'rejecting';
    
    if (acceptanceProbability >= 80) {
      responseType = 'accepting';
      playerFeedback = "This offer looks great! I'm ready to sign.";
    } else if (acceptanceProbability >= 60) {
      responseType = 'considering';
      playerFeedback = "This is a fair offer, but I'd like to think it over.";
    } else if (acceptanceProbability >= 30) {
      responseType = 'demanding';
      playerFeedback = "I believe I'm worth more than this. Can we do better?";
    } else {
      responseType = 'rejecting';
      playerFeedback = "This offer is too low for someone of my caliber.";
    }

    res.json({
      acceptanceProbability,
      playerFeedback,
      responseType
    });
  } catch (error) {
    console.error("Error getting negotiation feedback:", error);
    next(error);
  }
});

/**
 * POST /api/players/:playerId/negotiate-contract
 * Submit final contract offer (replaces existing negotiate endpoint for new modal)
 */
router.post('/:playerId/negotiate-contract', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { playerId } = req.params;
    const { salary, years } = req.body;
    const userId = req.user.claims.sub;
    
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) {
      return res.status(404).json({ message: "Your team was not found." });
    }

    const player = await storage.players.getPlayerById(parseInt(playerId));
    if (!player || player.teamId !== userTeam.id) {
      return res.status(404).json({ message: "Player not found on your team." });
    }

    // Use existing negotiation service
    const negotiationResult = await ContractService.negotiatePlayerContract(parseInt(playerId), salary, years);

    if (negotiationResult.accepted) {
      // Update the player's contract
      const updatedPlayer = await ContractService.updatePlayerContract(parseInt(playerId), salary, years);
      
      // Calculate signing bonus
      const contractCalc = ContractService.calculateContractValue(player);
      const signingBonus = Math.round(contractCalc.marketValue * 0.2);
      
      // Mock season data
      const currentSeason = 0;
      const startSeason = currentSeason + 1;
      const endSeason = startSeason + years - 1;
      
      res.json({
        accepted: true,
        startSeason,
        endSeason,
        signingBonus,
        message: negotiationResult.message
      });
    } else {
      res.json({
        accepted: false,
        feedback: negotiationResult.message
      });
    }
  } catch (error) {
    console.error("Error negotiating contract:", error);
    next(error);
  }
});

// Abilities system routes (temporarily disabled - needs schema update)
// router.post('/:id/train-abilities', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
//   try {
//     const userId = req.user.claims.sub;
//     const team = await storage.teams.getTeamByUserId(userId);
//     if (!team) {
//       return res.status(404).json({ message: "Team not found for current user." });
//     }

//     const playerId = req.params.id;
//     const player = await storage.players.getPlayerById(parseInt(playerId));

//     if (!player || player.teamId !== team.id) {
//       return res.status(404).json({ message: "Player not found or not owned by your team." });
//     }

//     // Abilities functionality requires schema update to support player abilities
//     res.json({
//       success: false,
//       message: "Ability training system is currently under maintenance."
//     });
//   } catch (error) {
//     console.error("Error training player abilities:", error);
//     next(error);
//   }
// });

export default router;
