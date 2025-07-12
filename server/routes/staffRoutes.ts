import { Router, type Response, type NextFunction } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../replitAuth';
import { z } from 'zod';
import { ContractService } from '../services/contractService';

const router = Router();

const staffContractNegotiationSchema = z.object({
    salary: z.number().min(1000, "Salary must be at least 1000.").max(50000000, "Salary cannot exceed 50,000,000."),
});

/**
 * GET /api/staff
 * Get all staff for the authenticated user's team
 */
router.get('/', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    
    if (!userTeam) {
      return res.status(404).json({ message: "Your team was not found." });
    }

    const staff = await storage.staff.getStaffByTeamId(userTeam.id);
    res.json(staff);
  } catch (error) {
    console.error("Error fetching staff:", error);
    next(error);
  }
});

/**
 * GET /api/staff/:staffId/contract-value
 * Get contract value calculation for a staff member using Universal Value Formula
 */
router.get('/:staffId/contract-value', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { staffId } = req.params;
    const userId = req.user.claims.sub;
    
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) {
        return res.status(404).json({ message: "Your team was not found." });
    }

    const staffMember = await storage.staff.getStaffById(staffId);
    if (!staffMember || staffMember.teamId !== userTeam.id) {
      return res.status(404).json({ message: "Staff member not found on your team or does not exist." });
    }

    const contractCalc = ContractService.calculateContractValue(staffMember);

    res.json({
      success: true,
      data: contractCalc
    });
  } catch (error) {
    console.error("Error calculating staff contract value:", error);
    next(error);
  }
});

/**
 * POST /api/staff/:staffId/negotiate
 * Negotiate a contract with a staff member using the Universal Value Formula system
 */
router.post('/:staffId/negotiate', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const { staffId } = req.params;
    const { salary } = staffContractNegotiationSchema.parse(req.body);

    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) {
        return res.status(404).json({ message: "Your team was not found." });
    }

    const staffMember = await storage.staff.getStaffById(staffId);
    if (!staffMember || staffMember.teamId !== userTeam.id) {
      return res.status(404).json({ message: "Staff member not found on your team or does not exist." });
    }

    // Use the new UVF-based staff contract negotiation system
    const negotiationResult = await ContractService.negotiateStaffContract(staffId, salary);

    if (negotiationResult.accepted) {
      // Update the staff member's contract
      const updatedStaff = await ContractService.updateStaffContract(staffId, salary);
      
      if (!updatedStaff) {
        return res.status(500).json({ message: "Failed to update staff contract details." });
      }

      res.json({
        success: true,
        negotiationResult,
        staff: updatedStaff
      });
    } else {
      res.json({
        success: false,
        negotiationResult
      });
    }
  } catch (error) {
    console.error("Error negotiating staff contract:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid contract negotiation data.", errors: error.errors });
    }
    next(error);
  }
});

export default router;