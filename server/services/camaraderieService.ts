// server/services/camaraderieService.ts
import { db } from "../db";
import { players, teams, staff } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import type { Player, Team, Staff } from "@shared/schema";

/**
 * Clamps a number between a minimum and maximum value.
 * @param value The number to clamp.
 * @param min The minimum value.
 * @param max The maximum value.
 * @returns The clamped number.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

interface PlayerWithTeamAndCoach extends Player {
  team: Team;
  headCoach?: Staff | null; // Assuming head coach is fetched separately or joined
}

/**
 * Updates the individual camaraderie score for a single player at the end of a season.
 * This function will be called as part of the "End of Season (Day 17)" event.
 */
export async function updatePlayerCamaraderieEndOfSeason(
  playerId: string,
  teamWinPercentage: number,
  teamWonChampionship: boolean,
  headCoachLeadership: number = 0 // Default to 0 if no coach or leadership stat
): Promise<void> {
  const player = await db.select().from(players).where(eq(players.id, playerId)).limit(1).then(res => res[0]);

  if (!player) {
    console.error(`Player with ID ${playerId} not found for camaraderie update.`);
    return;
  }

  let currentCamaraderie = player.camaraderie || 50;
  let camaraderieBonus = 0;

  // 1. Apply Small Annual Decay
  currentCamaraderie -= 5;

  // 2. Apply Positive Modifiers
  // Years with Team (Loyalty Bonus)
  const yearsOnTeam = player.yearsOnTeam || 0;
  camaraderieBonus += yearsOnTeam * 2;

  // Team Success (Winning)
  if (teamWinPercentage >= 0.60) {
    camaraderieBonus += 10;
  }
  if (teamWonChampionship) {
    camaraderieBonus += 25; // This is a huge bonding moment!
  }

  // Head Coach Influence (Leadership)
  camaraderieBonus += headCoachLeadership * 0.5;

  // 3. Apply Negative Modifiers
  // Team Failure (Losing)
  if (teamWinPercentage <= 0.40) {
    // Note: This was camaraderie_bonus -= 10 in the spec, applying to the bonus.
    // If it's meant to be a direct penalty to current camaraderie, it should be:
    // currentCamaraderie -= 10;
    // For now, interpreting as reducing the positive bonus accumulation for the year.
    camaraderieBonus -= 10;
  }

  // 4. Final Calculation
  let newCamaraderie = currentCamaraderie + camaraderieBonus;
  newCamaraderie = clamp(newCamaraderie, 0, 100);

  await db.update(players)
    .set({
      camaraderie: newCamaraderie,
      yearsOnTeam: (player.yearsOnTeam || 0) + 1 // Increment years on team
    })
    .where(eq(players.id, playerId));

  console.log(`Player ${player.name} (${playerId}) camaraderie updated to ${newCamaraderie}. Years on team: ${ (player.yearsOnTeam || 0) + 1}`);
}

/**
 * Calculates and updates the overall team camaraderie score based on its players.
 * This should be called whenever team composition changes or individual player camaraderie is updated.
 */
export async function updateTeamCamaraderie(teamId: string): Promise<void> {
  const teamPlayers = await db.select({ camaraderie: players.camaraderie })
    .from(players)
    .where(eq(players.teamId, teamId));

  if (teamPlayers.length === 0) {
    await db.update(teams).set({ teamCamaraderie: 50 }).where(eq(teams.id, teamId)); // Default for empty team
    console.log(`Team ${teamId} has no players. Camaraderie set to default 50.`);
    return;
  }

  const totalCamaraderie = teamPlayers.reduce((sum, player) => sum + (player.camaraderie || 0), 0);
  const averageCamaraderie = totalCamaraderie / teamPlayers.length;
  const finalTeamCamaraderie = clamp(Math.round(averageCamaraderie), 0, 100);

  await db.update(teams)
    .set({ teamCamaraderie: finalTeamCamaraderie })
    .where(eq(teams.id, teamId));

  console.log(`Team ${teamId} camaraderie updated to ${finalTeamCamaraderie}.`);
}

// Placeholder for End of Season event function that would iterate through players
/**
 * Simulates the end-of-season process for updating camaraderie for all players on a team.
 */
export async function processEndOfSeasonCamaraderieForTeam(teamId: string): Promise<void> {
  const teamData = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1).then(res => res[0]);
  if (!teamData) {
    console.error(`Team ${teamId} not found for end-of-season camaraderie processing.`);
    return;
  }

  const teamPlayers = await db.select({ id: players.id }).from(players).where(eq(players.teamId, teamId));

  // Calculate win percentage (assuming wins and losses are tracked on the team object)
  const gamesPlayed = (teamData.wins || 0) + (teamData.losses || 0) + (teamData.draws || 0);
  const winPercentage = gamesPlayed > 0 ? (teamData.wins || 0) / gamesPlayed : 0;

  // Fetch Head Coach - Assuming 'head_coach' is a type in the staff table
  // This part needs to be adapted based on how head coach is actually linked or identified.
  // For now, let's assume we can query the staff table for a head coach.
  const headCoach = await db.select().from(staff)
    .where(sql`${staff.teamId} = ${teamId} AND ${staff.type} = 'head_coach'`)
    .limit(1).then(res => res[0]);

  const headCoachLeadership = headCoach?.coachingRating || 0; // Assuming 'coachingRating' holds leadership value

  // Determine if championship was won (this needs to be set elsewhere in game logic)
  // For this example, let's use the new `championshipsWon` field, assuming it's for the current season.
  // A more robust system would check if teamData.championshipsWon increased this season.
  // For now, if championshipsWon > 0, let's assume they won *this* season for simplicity in this function.
  // This should ideally be a flag passed in, e.g., `wonChampionshipThisSeason`.
  const teamWonChampionship = (teamData.championshipsWon || 0) > 0; // Simplified: needs proper season tracking

  console.log(`Processing End of Season for Team ${teamId}: Win% ${winPercentage.toFixed(2)}, Won Champ: ${teamWonChampionship}, Coach Leadership: ${headCoachLeadership}`);

  for (const player of teamPlayers) {
    await updatePlayerCamaraderieEndOfSeason(player.id, winPercentage, teamWonChampionship, headCoachLeadership);
  }

  // After all players are updated, recalculate the overall team camaraderie
  await updateTeamCamaraderie(teamId);

  // Reset seasonal stats like wins/losses for the new season (example)
  // This might be part of a larger end-of-season service
  // await db.update(teams).set({ wins: 0, losses: 0, draws: 0 }).where(eq(teams.id, teamId));
}

/**
 * Retrieves the current team camaraderie score.
 */
export async function getTeamCamaraderie(teamId: string): Promise<number | null> {
  const team = await db.select({ teamCamaraderie: teams.teamCamaraderie })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1)
    .then(res => res[0]);

  return team?.teamCamaraderie ?? null;
}

/**
 * Retrieves a player's individual camaraderie score.
 */
export async function getPlayerCamaraderie(playerId: string): Promise<number | null> {
  const player = await db.select({ camaraderie: players.camaraderie })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1)
    .then(res => res[0]);

  return player?.camaraderie ?? null;
}

// TODO:
// - Integrate `processEndOfSeasonCamaraderieForTeam` into the actual end-of-season game event.
// - Ensure `championshipsWon` is correctly updated and reflects *this season's* win for the bonus.
// - Refine head coach fetching and leadership stat usage.
// - Call `updateTeamCamaraderie` whenever a player is traded, signed, or released.

/**
 * Applies end-of-season player progression, potentially boosted by team camaraderie.
 * This is a placeholder and needs integration with actual progression mechanics.
 */
export async function applyEndOfSeasonPlayerProgression(teamId: string): Promise<void> {
  const teamCamaraderie = await getTeamCamaraderie(teamId);
  const teamPlayers = await db.select().from(players).where(eq(players.teamId, teamId));

  if (teamPlayers.length === 0) {
    console.log(`Team ${teamId} has no players for progression.`);
    return;
  }

  const isHighCamaraderie = teamCamaraderie !== null && teamCamaraderie > 75;
  console.log(`Processing EoS Player Progression for Team ${teamId}. Camaraderie: ${teamCamaraderie}, High Camaraderie Boost: ${isHighCamaraderie}`);

  for (const player of teamPlayers) {
    if (player.age < 24) {
      let progressionChance = 0.20; // Base 20% progression chance (EXAMPLE VALUE)
      if (isHighCamaraderie) {
        progressionChance += 0.05; // +5% boost
        console.log(`Player ${player.name} (Age ${player.age}) gets camaraderie progression boost. New chance: ${progressionChance.toFixed(2)}`);
      }

      // TODO: Actual progression roll and stat update logic
      // This part needs to be defined:
      // - How is progression determined beyond this chance?
      // - Which stats improve? By how much? Based on potential?
      if (Math.random() < progressionChance) {
        console.log(`Player ${player.name} (ID: ${player.id}) progressed! (Stat update logic TBD)`);
        // Example: await db.update(players).set({ speed: (player.speed || 0) + 1 }).where(eq(players.id, player.id));
      } else {
        console.log(`Player ${player.name} (ID: ${player.id}) did not progress this season.`);
      }
    }
  }
}

// Extend processEndOfSeasonCamaraderieForTeam to include progression
export async function processFullEndOfSeason(teamId: string): Promise<void> {
  console.log(`Starting Full End of Season Process for Team ${teamId}`);
  await processEndOfSeasonCamaraderieForTeam(teamId); // Updates camaraderie and yearsOnTeam
  await applyEndOfSeasonPlayerProgression(teamId); // Applies progression checks
  console.log(`Full End of Season Process for Team ${teamId} Completed.`);
  // Potentially reset seasonal stats like wins/losses here if not done elsewhere
  // await db.update(teams).set({ wins: 0, losses: 0, draws: 0, championshipsWonThisSeason: false (if such a field exists) }).where(eq(teams.id, teamId));
}


console.log("Camaraderie service initialized with progression placeholders.");
