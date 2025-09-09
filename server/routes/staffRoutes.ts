import { Router, type Response, type NextFunction } from 'express';
import { storage } from '../storage/index.js';
import { requireAuth } from "../middleware/firebaseAuth.js";
import { z } from 'zod';
import { ContractService } from '../services/contractService.js';
import type { Team, Staff } from '@shared/types/models';


const router = Router();

const staffContractNegotiationSchema = z.object({
    salary: z.number().min(1000, "Salary must be at least 1000.").max(50000000, "Salary cannot exceed 50,000,000."),
});

/**
 * GET /api/staff
 * Get all staff for the authenticated user's team with contract information
 */
router.get('/', requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    
    if (!userTeam) {
      return res.status(404).json({ message: "Your team was not found." });
    }

    const staff = await storage.staff.getStaffByTeamId(userTeam.id);
    
    // Calculate staff salaries using Universal Value Formula
    const staffWithContracts = staff.map((member: any) => {
      try {
        // Calculate dynamic salary using UVF
        const contractCalc = ContractService.calculateContractValue(member);
        
        return {
          ...member,
          contract: {
            id: null, // Staff don't have actual contract records
            salary: contractCalc.marketValue,
            duration: 3, // Default contract length for display
            remainingYears: 3,
            signedDate: new Date(),
            expiryDate: new Date()
          }
        };
      } catch (error) {
        console.error(`Error calculating salary for staff member ${member.id}:`, error);
        // Fallback to basic calculation
        return {
          ...member,
          contract: {
            id: null,
            salary: (member.level || 1) * 1000,
            duration: 3,
            remainingYears: 3,
            signedDate: new Date(),
            expiryDate: new Date()
          }
        };
      }
    });
    
    // Calculate total staff cost using Universal Value Formula
    const totalStaffCost = staffWithContracts.reduce((total: any, member: any) => {
      if (member.contract && member.contract.salary) {
        return total + member.contract.salary;
      }
      // Use UVF calculation if no contract exists
      const contractCalc = ContractService.calculateContractValue(member);
      return total + contractCalc.marketValue;
    }, 0);
    
    return res.json({
      staff: staffWithContracts,
      totalStaffCost,
      totalStaffMembers: staffWithContracts.length
    });
  } catch (error) {
    console.error("Error fetching staff:", error);
    return next(error);
  }
});

/**
 * GET /api/staff/:staffId/contract-value
 * Get contract value calculation for a staff member using Universal Value Formula
 */
router.get('/:staffId/contract-value', requireAuth, async (req: any, res: Response, next: NextFunction) => {
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

    return res.json({
      success: true,
      data: contractCalc
    });
  } catch (error) {
    console.error("Error calculating staff contract value:", error);
    return next(error);
  }
});

/**
 * POST /api/staff/:staffId/negotiate
 * Negotiate a contract with a staff member using the Universal Value Formula system
 */
router.post('/:staffId/negotiate', requireAuth, async (req: any, res: Response, next: NextFunction) => {
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

/**
 * DELETE /api/staff/:staffId/release
 * Release a staff member from the team
 */
router.delete('/:staffId/release', requireAuth, async (req: any, res: Response, next: NextFunction) => {
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

    // Calculate release fee (typically 50% of remaining contract value)
    const contractCalc = ContractService.calculateContractValue(staffMember);
    const releaseFee = Math.round(contractCalc.marketValue * 0.5);

    // Check if team has enough credits
    const teamFinances = await storage.teamFinances.getTeamFinances(userTeam.id);
    if (!teamFinances || Number(teamFinances.credits) < releaseFee) {
      return res.status(400).json({ 
        message: `Insufficient credits. Need ${releaseFee.toLocaleString()}₡ to release ${staffMember.name}.`,
        requiredFee: releaseFee,
        currentCredits: teamFinances?.credits || 0
      });
    }

    // Deduct release fee and delete staff member
    await storage.teamFinances.updateTeamFinances(userTeam.id, { credits: Number(teamFinances.credits) - releaseFee });
    const released = await storage.staff.deleteStaff(parseInt(staffId));

    if (!released) {
      return res.status(500).json({ message: "Failed to release staff member." });
    }

    res.json({
      success: true,
      message: `${staffMember.name} has been released from the team.`,
      releaseFee,
      remainingCredits: Number(teamFinances.credits) - releaseFee
    });
  } catch (error) {
    console.error("Error releasing staff member:", error);
    next(error);
  }
});

export default router;