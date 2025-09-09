import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from '../storage/index.js'; // Adjusted path
import { requireAuth } from "../middleware/firebaseAuth.js";
import { getPrismaClient } from "../database.js";
import type { Player, Team } from '@shared/types/models';

// import { z } from "zod"; // For validation if needed

const router = Router();

// TODO: Move these helper functions to a dedicated ScoutingService or PlayerValuationService
function getStatRange(actualStat: number, variance: number, scoutingLevel: number): string {
  // Higher scouting level reduces variance, making range tighter
  const effectiveVariance = Math.max(1, variance - (scoutingLevel * 1.5)); // Example adjustment
  const min = Math.max(1, Math.floor(actualStat - effectiveVariance));
  const max = Math.min(40, Math.ceil(actualStat + effectiveVariance));

  if (scoutingLevel >= 3) { // Higher levels might give more precise info or just a tighter range
    return `${min}-${max}`;
  }
  return `${min}-${max}`; // Broader for lower levels
}

function getSalaryRange(actualSalary: number, scoutingLevel: number): string {
  const variancePercentage = scoutingLevel === 4 ? 0.05 : scoutingLevel === 3 ? 0.10 : 0.20; // 5%, 10%, 20%
  const min = Math.floor(actualSalary * (1 - variancePercentage));
  const max = Math.floor(actualSalary * (1 + variancePercentage));
  return `${min.toLocaleString()} - ${max.toLocaleString()} Credits`;
}

function getFinancialRange(actualCredits: number | null | undefined, scoutingLevel: number): string {
  if (actualCredits === null || actualCredits === undefined) return "Unknown";
  if (scoutingLevel < 3) return "Vague (Upgrade Scouting)";

  if (actualCredits < 50000) return "Very Low (<50K)";
  if (actualCredits < 200000) return "Low (50K-200K)";
  if (actualCredits < 750000) return "Moderate (200K-750K)";
  if (actualCredits < 2000000) return "Healthy (750K-2M)";
  return "Wealthy (>2M)";
}

function generateScoutingNotes(targetTeam: any, targetPlayers: any[], scoutingLevel: number): string[] {
  const notes = [];
  if (!targetTeam) return ["No team data to generate notes."];

  notes.push(`${targetTeam.name} currently competes in Division ${targetTeam.division}.`);

  if (scoutingLevel >= 2 && targetPlayers.length > 0) {
    const avgAge = targetPlayers.reduce((sum: any, p: any) => sum + (p.age || 24), 0) / targetPlayers.length;
    notes.push(`Estimated average squad age: ${avgAge.toFixed(1)} years.`);

    const raceCounts: { [key: string]: number } = {};
    targetPlayers.forEach(p => {
      raceCounts[p.race] = (raceCounts[p.race] || 0) + 1;
    });
    const dominantRaceEntry = Object.entries(raceCounts).sort((a: any, b: any) => b[1] - a[1])[0];
    if (dominantRaceEntry) {
      notes.push(`Predominant race: ${dominantRaceEntry[0]} (${dominantRaceEntry[1]} players).`);
    }
  }

  if (scoutingLevel >= 3 && targetPlayers.length > 0) {
    // Simplified overall strength assessment
    const avgPlayerPower = targetPlayers.reduce((sum: any, p: any) => {
        return sum + (p.speed || 20) + (p.power || 20) + (p.throwing || 20) + (p.catching || 20) + (p.kicking || 20);
    }, 0) / (targetPlayers.length * 5); // Average of 5 core stats

    if (avgPlayerPower > 28) notes.push("Team appears to have strong individual player stats.");
    else if (avgPlayerPower > 22) notes.push("Team player stats seem competitive for their division.");
    else notes.push("Player stats suggest areas for development or a younger squad.");
  }

  if (scoutingLevel >= 4) {
    notes.push("Detailed tactical tendencies and financial stability reports available with Elite Scouting upgrade.");
  } else {
    notes.push("Upgrade scouting department for more in-depth analysis.");
  }

  return notes;
}

// ===== TEAM SCOUTING SYSTEM =====
router.get("/:teamId/scout", requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub; // User performing the scout
    const { teamId: targetTeamId } = req.params; // Team being scouted

    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) return res.status(404).json({ message: "Your team not found to initiate scouting." });

    const targetTeam = await storage.teams.getTeamById(parseInt(targetTeamId));
    if (!targetTeam) return res.status(404).json({ message: "Target team for scouting not found." });

    // Simulate scouting cost or check if already scouted recently
    // const scoutingCost = 1000; // Example cost
    // const finances = await storage.getTeamFinances(userTeam.id);
    // if (!finances || (finances.credits || 0) < scoutingCost) {
    //     return res.status(400).json({ message: `Insufficient credits to scout. Cost: ${scoutingCost}`});
    // }
    // await storage.updateTeamFinances(userTeam.id, { credits: (finances.credits || 0) - scoutingCost });

    const userStaff = await storage.staff.getStaffByTeamId(userTeam.id);
    const scouts = userStaff.filter((s: any) => s.type === 'head_scout' || s.type === 'recruiting_scout' || s.type === 'scout');
    let scoutingPower = scouts.reduce((sum: any, s: any) => sum + (s.scoutingRating || 0), 0);
    scoutingPower = Math.max(10, scoutingPower); // Minimum scouting power

    const scoutingLevel = scoutingPower >= 150 ? 4 : scoutingPower >= 100 ? 3 : scoutingPower >= 50 ? 2 : 1;

    const prisma = await getPrismaClient();
    const [targetPlayers, targetStaffList, targetFinances, targetStadiumInfo] = await Promise.all([
      storage?.players.getPlayersByTeamId(parseInt(targetTeamId)),
      storage.staff.getStaffByTeamId(parseInt(targetTeamId)),
      storage.teamFinances.getTeamFinances(parseInt(targetTeamId)),
      prisma.stadium.findUnique({ where: { teamId: parseInt(targetTeamId) } })
    ]);

    const report = {
      scoutingLevel,
      scoutingPower,
      confidence: Math.min(95, 30 + Math.floor(scoutingPower / 2.5)),
      stadium: targetStadiumInfo ? { name: (targetStadiumInfo as any).name, capacity: scoutingLevel >= 2 ? (targetStadiumInfo as any).capacity : "Unknown", level: scoutingLevel >= 3 ? (targetStadiumInfo as any).level : "Unknown" } : null,
      players: targetPlayers.map((p: any) => ({
        id: p.id, firstName: p.firstName, lastName: p.lastName, race: p.race, age: scoutingLevel >= 1 ? p.age : "?", position: p.position,
        stats: scoutingLevel >= 2 ? {
          speed: getStatRange(p.speed, 8, scoutingLevel), power: getStatRange(p.power, 8, scoutingLevel), throwing: getStatRange(p.throwing, 8, scoutingLevel),
          catching: getStatRange(p.catching, 8, scoutingLevel), kicking: getStatRange(p.kicking, 8, scoutingLevel), stamina: getStatRange(p.stamina, 8, scoutingLevel),
          leadership: getStatRange(p.leadership, 8, scoutingLevel), agility: getStatRange(p.agility, 8, scoutingLevel),
        } : "Basic Stats Obscured",
        salary: scoutingLevel >= 3 ? getSalaryRange(p.salary, scoutingLevel) : "Confidential",
        abilities: scoutingLevel >= 4 && p.abilities ? (JSON.parse(p.abilities as string || "[]")) : (scoutingLevel >=3 ? "Some abilities known" : "Unknown"),
      })),
      staff: targetStaffList.map((s: any) => ({
        name: s.name, type: s.type, level: scoutingLevel >= 2 ? s.level : "?",
        salary: scoutingLevel >= 3 ? getSalaryRange(s.salary, scoutingLevel) : "Confidential",
        ratings: scoutingLevel >= 4 ? { offense: s.offenseRating, defense: s.defenseRating, /* ... other ratings */ } : "Specific Ratings Obscured",
      })),
      finances: scoutingLevel >= 3 ? { estimatedBudget: getFinancialRange(targetFinances?.credits, scoutingLevel) } : "Financial Details Obscured",
      notes: generateScoutingNotes(targetTeam, targetPlayers, scoutingLevel),
      generatedAt: new Date().toISOString()
    };
    res.json(report);
  } catch (error) {
    console.error("Error generating scouting report:", error);
    next(error);
  }
});

router.get("/scoutable-teams", requireAuth, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const userTeam = await storage.teams.getTeamByUserId(userId);
    if (!userTeam) return res.status(404).json({ message: "Your team not found." });

    const userDivision = userTeam.division || 8;
    const scoutableDivisionsSet = new Set<number>([
      userDivision,
      Math.max(1, userDivision - 1),
      Math.min(8, userDivision + 1)
    ]);

    const scoutableTeamsPromises = Array.from(scoutableDivisionsSet).map(async (div) => {
      const divisionTeams = await storage.teams.getTeamsByDivision(div);
      return divisionTeams
        .filter((t: any) => t.id !== userTeam.id) // Exclude user's own team
        .map((t: any) => ({
          id: t.id, name: t.name, division: t.division, teamPower: t.teamPower || 0,
          // Cost could be dynamic based on division difference, team rep, etc.
          scoutingCost: Math.abs(div - userDivision) * 500 + 500 // Example: 500 for same div, 1000 for adjacent
        }));
    });

    const results = await Promise.all(scoutableTeamsPromises);
    const scoutableTeams = results.flat();

    res.json({
      teams: scoutableTeams,
      userDivision: userDivision,
      scoutableDivisions: Array.from(scoutableDivisionsSet).sort((a,b) => a-b),
    });
  } catch (error) {
    console.error("Error fetching scoutable teams:", error);
    next(error);
  }
});

// Helper to calculate team power (if not using the one from teamRoutes or a central service yet)
function calculateTeamPower(players: any[]): number {
  if (!players || players.length === 0) return 0;
  const playersWithPower = players.map(player => ({
    ...player,
    // CAR = Average(Speed, Power, Agility, Throwing, Catching, Kicking)
    individualPower: Math.round(((player.speed || 20) + (player.power || 20) + (player.agility || 20) + 
                                (player.throwing || 20) + (player.catching || 20) + (player.kicking || 20)) / 6)
  }));
  const topPlayers = playersWithPower
    .sort((a: any, b: any) => b.individualPower - a.individualPower)
    .slice(0, 9); // Consider only top N players for power
  const totalPower = topPlayers.reduce((sum: any, player: any) => sum + player.individualPower, 0);
  return Math.round(totalPower / Math.max(1, topPlayers.length));
}


export default router;
