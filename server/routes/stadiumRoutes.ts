import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage/index";
import { stadiumStorage } from "../storage/stadiumStorage";
import { teamFinancesStorage } from "../storage/teamFinancesStorage";
import { sponsorshipStorage } from "../storage/sponsorshipStorage"; // For stadium revenue
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";
import type { Stadium } from "@shared/schema"; // Import Stadium type

const router = Router();

// TODO: These helper functions should ideally be part of a StadiumService
function getAvailableUpgrades(stadium: Stadium | undefined) {
  const upgrades = [];
  if (!stadium || typeof stadium !== 'object') return upgrades;

  const currentFacilities = stadium.facilities && typeof stadium.facilities === 'string' ?
                           JSON.parse(stadium.facilities) :
                           (stadium.facilities || {});
  // ... (rest of the function remains largely the same, ensure stadium properties are accessed safely, e.g., stadium.fieldSize)
   if (stadium.fieldSize === "regulation") {
    upgrades.push({ type: "field", name: "Extended Field", description: "Larger field provides more strategic options", cost: 75000, effect: { fieldSize: "extended", homeAdvantage: (stadium.homeAdvantage || 5) + 2 } });
  }
  // ... (other upgrade logic) ...
  return upgrades;
}

function getUpgradeDetails(upgradeType: string, upgradeName: string, stadium: Stadium | undefined) {
  const availableUpgrades = getAvailableUpgrades(stadium);
  return availableUpgrades.find(u => u.type === upgradeType && u.name === upgradeName);
}

function applyUpgradeEffect(stadium: Stadium, effect: any): Partial<Stadium> {
  const updates: Partial<Stadium> = { ...effect };
  if (effect.facilities && stadium.facilities) {
      const currentFacilities = typeof stadium.facilities === 'string' ? JSON.parse(stadium.facilities) : stadium.facilities;
      updates.facilities = JSON.stringify({ ...currentFacilities, ...effect.facilities}) as any; // Cast to any if type conflict
  } else if (effect.facilities) {
      updates.facilities = JSON.stringify(effect.facilities) as any; // Cast to any
  }
  updates.lastUpgrade = new Date();
  return updates;
}

function generateEventDetails(eventType: string, stadium: Stadium | undefined) {
  if (!stadium) return { name: "Error", revenue: 0, cost: 0, attendees: 0, duration: 0, description: "Stadium data missing."};
  const baseAttendees = Math.floor((stadium.capacity || 5000) * 0.6);
  // ... (rest of the function) ...
  switch (eventType) {
    case "concert": return { name: "Major Concert", revenue: baseAttendees * 25, cost: baseAttendees * 8, attendees: baseAttendees, duration: 4, description: "Host a major concert event." };
    default: return { name: "Local Tournament", revenue: baseAttendees * 10, cost: baseAttendees * 3, attendees: baseAttendees, duration: 2, description: "Host a local tournament." };
  }
}


router.get('/', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found for current user." });

    let stadium = await stadiumStorage.getTeamStadium(team.id);
    if (!stadium) {
      stadium = await stadiumStorage.createStadium({
        teamId: team.id, name: `${team.name} Stadium`, level: 1, capacity: 5000,
        fieldType: "standard", fieldSize: "regulation", lighting: "basic", surface: "grass",
        drainage: "basic", facilities: { concessions: 1, parking: 1, training: 1, medical: 1, security: 1 },
        upgradeCost: 50000, maintenanceCost: 5000, revenueMultiplier: 100,
        weatherResistance: 50, homeAdvantage: 5,
        // constructionDate and lastUpgrade are handled by storage/DB
      });
    }

    const upgrades = await stadiumStorage.getStadiumUpgrades(stadium.id);
    const events = await stadiumStorage.getStadiumEvents(stadium.id);

    res.json({
      stadium: { ...stadium, facilities: stadium.facilities ? JSON.parse(stadium.facilities as string) : {} },
      upgrades, events, availableUpgrades: getAvailableUpgrades(stadium)
    });
  } catch (error) {
    console.error("Error fetching stadium data:", error);
    next(error);
  }
});

const upgradeSchema = z.object({
    upgradeType: z.string().min(1), upgradeName: z.string().min(1),
});
router.post('/upgrade', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { upgradeType, upgradeName } = upgradeSchema.parse(req.body);

    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found." });

    const stadium = await stadiumStorage.getTeamStadium(team.id);
    if (!stadium) return res.status(404).json({ message: "Stadium not found." });

    const finances = await teamFinancesStorage.getTeamFinances(team.id);
    if (!finances) return res.status(404).json({ message: "Team finances not found." });

    const upgradeDetails = getUpgradeDetails(upgradeType, upgradeName, stadium);
    if (!upgradeDetails) return res.status(400).json({ message: "Invalid upgrade selected or not available." });

    if ((finances.credits || 0) < upgradeDetails.cost) {
      return res.status(400).json({ message: `Insufficient credits. Cost: ${upgradeDetails.cost}, Available: ${finances.credits || 0}` });
    }

    await stadiumStorage.createFacilityUpgrade({
      stadiumId: stadium.id, upgradeType, name: upgradeName,
      description: upgradeDetails.description, cost: upgradeDetails.cost,
      effect: upgradeDetails.effect,
    });

    const stadiumUpdates = applyUpgradeEffect(stadium, upgradeDetails.effect);
    const updatedStadium = await stadiumStorage.updateStadium(stadium.id, stadiumUpdates);

    await teamFinancesStorage.updateTeamFinances(team.id, {
      credits: (finances.credits || 0) - upgradeDetails.cost
    });

    res.json({
        message: `${upgradeDetails.name} upgraded successfully!`,
        stadium: updatedStadium ? { ...updatedStadium, facilities: updatedStadium.facilities ? JSON.parse(updatedStadium.facilities as string) : {} } : null,
        remainingCredits: (finances.credits || 0) - upgradeDetails.cost
    });
  } catch (error) {
    console.error("Error upgrading stadium facility:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid upgrade data", errors: error.errors });
    next(error);
  }
});

const fieldSizeSchema = z.object({
    fieldSize: z.enum(["regulation", "extended", "compact"]),
});
router.post('/field-size', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const { fieldSize } = fieldSizeSchema.parse(req.body);

    const stadium = await stadiumStorage.getTeamStadium(team.id);
    if (!stadium) return res.status(404).json({ message: "Stadium not found." });

    const cost = 50000;
    const finances = await teamFinancesStorage.getTeamFinances(team.id);
    if (!finances || (finances.credits || 0) < cost) return res.status(400).json({ message: "Insufficient credits for changing field size." });

    await teamFinancesStorage.updateTeamFinances(team.id, { credits: (finances.credits || 0) - cost });
    await stadiumStorage.updateStadium(stadium.id, { fieldSize });

    res.json({ success: true, message: `Field size changed to ${fieldSize} successfully.` });
  } catch (error) {
    console.error("Error changing field size:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid field size data", errors: error.errors });
    next(error);
  }
});

const sponsorSchema = z.object({
    sponsorTier: z.string().min(1),
});
router.post('/sponsors', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const { sponsorTier } = sponsorSchema.parse(req.body);
    const sponsorDetails = { cost: 0, monthlyRevenue: 0, name: "Generic Sponsor" };
    if (sponsorTier === "bronze") { sponsorDetails.monthlyRevenue = 5000; sponsorDetails.name="Bronze Corp";}
    else if (sponsorTier === "silver") { sponsorDetails.monthlyRevenue = 15000; sponsorDetails.name="Silver Inc";}
    else if (sponsorTier === "gold") { sponsorDetails.monthlyRevenue = 30000; sponsorDetails.name="Gold United";}
    else return res.status(400).json({ message: "Invalid sponsor tier."});

    // TODO: Actual sponsorship creation logic using sponsorshipStorage
    // await sponsorshipStorage.createSponsorshipDeal({ teamId: team.id, sponsorName: sponsorDetails.name, ... });
    res.json({ success: true, message: `Sponsor contract for ${sponsorDetails.name} (${sponsorTier}) signed successfully (mock).` });
  } catch (error) {
    console.error("Error managing sponsors:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid sponsor data", errors: error.errors });
    next(error);
  }
});

const eventSchema = z.object({
    eventType: z.string().min(1),
    name: z.string().min(3).max(100).optional(),
    eventDate: z.string().datetime(),
});
router.post('/event', isAuthenticated, async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.claims.sub;
    const { eventType, name, eventDate } = eventSchema.parse(req.body);

    const team = await storage.teams.getTeamByUserId(userId);
    if (!team) return res.status(404).json({ message: "Team not found." });

    const stadium = await stadiumStorage.getTeamStadium(team.id);
    if (!stadium) return res.status(404).json({ message: "Stadium not found." });

    const eventDetails = generateEventDetails(eventType, stadium);
    const finalEventName = name || eventDetails.name;

    const event = await stadiumStorage.createStadiumEvent({
      stadiumId: stadium.id, eventType, name: finalEventName,
      revenue: eventDetails.revenue, cost: eventDetails.cost, attendees: eventDetails.attendees,
      eventDate: new Date(eventDate), duration: eventDetails.duration,
    });
    res.status(201).json({ event, message: `${finalEventName} scheduled successfully.` });
  } catch (error) {
    console.error("Error creating stadium event:", error);
    if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid event data", errors: error.errors });
    next(error);
  }
});

router.get('/revenue/:teamId', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId } = req.params;
    // TODO: Get current season year for filtering revenue
    const currentSeason = await leagueStorage.getCurrentSeason();
    const seasonYear = currentSeason?.year || new Date().getFullYear();

    const revenue = await sponsorshipStorage.getStadiumRevenueForTeamBySeason(teamId, seasonYear);
    if (!revenue || revenue.length === 0) return res.json({ message: "No revenue data found for this team for the current season.", data: [] });
    res.json(revenue);
  } catch (error) {
    console.error("Error fetching stadium revenue:", error);
    next(error);
  }
});

export default router;
