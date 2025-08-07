import { Router, type Response, type NextFunction } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../googleAuth';
import { z } from 'zod';
import { ContractService } from '../services/contractService';

const router = Router();

const staffContractNegotiationSchema = z.object({
    salary: z.number().min(1000, "Salary must be at least 1000.").max(50000000, "Salary cannot exceed 50,000,000."),
});

/**
 * GET /api/staff
 * Get all staff for the authenticated user's team with contract information
 */
router.get('/', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    
    if (!userTeam) {
      return res.status(404).json({ message: "Your team was not found." });
    }

    const staff = await storage.staff.getStaffByTeamId(userTeam.id);
    
    // Get contracts for all staff members
    const staffWithContracts = await Promise.all(
      staff.map(async (member) => {
        try {
          const contracts = await storage.contracts.getActiveContractsByStaff(member.id);
          const activeContract = contracts.length > 0 ? contracts[0] : null;
          
          return {
            ...member,
            contract: activeContract ? {
              id: activeContract.id,
              salary: Number(activeContract.salary),
              duration: activeContract.length,
              remainingYears: activeContract.length, // Use length as default for remaining years
              signedDate: activeContract.startDate,
              expiryDate: activeContract.startDate // Will calculate properly later
            } : null
          };
        } catch (error) {
          console.error(`Error fetching contract for staff member ${member.id}:`, error);
          // Return staff member without contract if contract fetch fails
          return {
            ...member,
            contract: null
          };
        }
      })
    );
    
    // Calculate total staff cost
    const totalStaffCost = staffWithContracts.reduce((total, member) => {
      if (member.contract && member.contract.salary) {
        return total + member.contract.salary;
      }
      // Fallback to level-based calculation if no contract
      return total + (member.level * 1000);
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

/**
 * DELETE /api/staff/:staffId/release
 * Release a staff member from the team
 */
router.delete('/:staffId/release', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
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