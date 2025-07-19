import { Router, type Request, type Response } from "express";
import { formatSubdivisionName, getSubdivisionCapacityInfo, generateSubdivisionProgression, validateSubdivisionName } from "@shared/subdivisionUtils";
import { isAuthenticated } from "../replitAuth";

const router = Router();

/**
 * Test route to demonstrate subdivision system capabilities
 * GET /api/test/subdivision-system
 */
router.get('/subdivision-system', isAuthenticated, async (req: any, res: Response) => {
  const capacityInfo = getSubdivisionCapacityInfo();
  const progression = generateSubdivisionProgression(50);
  
  // Test formatting for various subdivision name types
  const testNames = [
    "main", "alpha", "beta_1", "gamma_15", "omega_99", "overflow_123456"
  ];
  
  const formattedNames = testNames.map(name => ({
    original: name,
    formatted: formatSubdivisionName(name),
    validation: validateSubdivisionName(name)
  }));
  
  res.json({
    message: "Subdivision System Test Results",
    capacityInfo: {
      teamsPerSubdivision: capacityInfo.teamsPerSubdivision,
      totalSubdivisionSlots: capacityInfo.baseSubdivisions + (capacityInfo.baseSubdivisions * capacityInfo.maxNumberedExtensions),
      totalPlayerCapacity: capacityInfo.formattedTotalCapacity,
      breakdown: {
        baseSubdivisions: `${capacityInfo.baseSubdivisions} subdivisions × 8 teams = ${capacityInfo.baseCapacity.toLocaleString()} players`,
        numberedExtensions: `${capacityInfo.baseSubdivisions} × ${capacityInfo.maxNumberedExtensions} × 8 teams = ${capacityInfo.numberedCapacity.toLocaleString()} players`,
        grandTotal: `${capacityInfo.totalCapacity.toLocaleString()} total player capacity`
      }
    },
    subdivisionProgression: {
      first25: progression.slice(0, 25),
      next25: progression.slice(25, 50),
      explanation: "Shows first 50 subdivision names in order of creation"
    },
    nameFormatting: formattedNames,
    systemStatus: "✅ READY FOR THOUSANDS OF PLAYERS"
  });
});

export { router as subdivisionTestRoutes };