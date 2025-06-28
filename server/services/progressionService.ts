import { db, pool } from "../db";
import { players, teams, staff } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

// Convert 1-5 star potential to 10-point scale (for half-stars)
function convertPotentialTo10Point(oldPotential: number | string | null): number {
  if (!oldPotential) return 6; // Default to 3 stars
  const value = typeof oldPotential === 'string' ? parseFloat(oldPotential) : oldPotential;
  return Math.round(value * 2); // 1-5 becomes 2-10
}

// Calculate stat cap based on 10-point potential
function calculateStatCap(potential10Point: number): number {
  return 10 + (potential10Point * 3);
}

// Daily progression check (runs at 3 AM)
export async function runDailyProgression() {
  console.log("Running daily player progression check...");
  
  try {
    // Get all players
    const allPlayers = await db.select().from(players);
    
    for (const player of allPlayers) {
      // Calculate daily progress chance
      const baseDailyChance = 1; // 1%
      let ageModifier = 0;
      
      if (player.age >= 18 && player.age <= 23) {
        ageModifier = 2; // +2% for young players
      } else if (player.age >= 31) {
        ageModifier = -5; // -5% for older players
      }
      
      const dailyProgressChance = baseDailyChance + ageModifier;
      
      // Roll for progression
      if (Math.random() * 100 < dailyProgressChance) {
        // Find a stat that's not at cap to improve
        const stats = [
          { name: 'speed', value: player.speed, potential: player.speedPotential },
          { name: 'power', value: player.power, potential: player.powerPotential },
          { name: 'throwing', value: player.throwing, potential: player.throwingPotential },
          { name: 'catching', value: player.catching, potential: player.catchingPotential },
          { name: 'kicking', value: player.kicking, potential: player.kickingPotential },
          { name: 'stamina', value: player.stamina, potential: player.staminaPotential },
          { name: 'leadership', value: player.leadership, potential: player.leadershipPotential },
          { name: 'agility', value: player.agility, potential: player.agilityPotential }
        ];
        
        // Filter stats that haven't reached their cap
        const improvableStats = stats.filter(stat => {
          const potential10 = convertPotentialTo10Point(stat.potential);
          const cap = calculateStatCap(potential10);
          return stat.value < cap;
        });
        
        if (improvableStats.length > 0) {
          // Randomly pick a stat to improve
          const statToImprove = improvableStats[Math.floor(Math.random() * improvableStats.length)];
          
          // Update the player's stat
          const updateQuery = sql`
            UPDATE players 
            SET ${sql.identifier(statToImprove.name)} = ${sql.identifier(statToImprove.name)} + 1,
                updated_at = NOW()
            WHERE id = ${player.id}
          `;
          
          await pool.query(updateQuery.sql, updateQuery.values);
          
          console.log(`Player ${player.name} improved ${statToImprove.name} from ${statToImprove.value} to ${statToImprove.value + 1}`);
        }
      }
    }
  } catch (error) {
    console.error("Error in daily progression:", error);
  }
}

// End of season progression (Day 17)
export async function runSeasonEndProgression() {
  console.log("Running end-of-season player progression...");
  
  try {
    // Get all teams with their staff
    const allTeams = await db.select().from(teams);
    
    for (const team of allTeams) {
      // Get team's head coach
      const [headCoach] = await db
        .select()
        .from(staff)
        .where(and(eq(staff.teamId, team.id), eq(staff.type, 'head_coach')));
      
      // Get team's trainers
      const trainers = await db
        .select()
        .from(staff)
        .where(eq(staff.teamId, team.id));
      
      // Get team's players
      const teamPlayers = await db
        .select()
        .from(players)
        .where(eq(players.teamId, team.id));
      
      // Process each player
      for (const player of teamPlayers) {
        // Calculate base progression chances
        const baseChance = 15; // Base 15% chance
        
        // Head coach motivation bonus
        const coachMotivationBonus = headCoach ? headCoach.motivation * 0.1 : 0;
        const finalBaseChance = baseChance + coachMotivationBonus;
        
        // Development multiplier from head coach
        const developmentMultiplier = headCoach ? (1 + headCoach.development / 100) : 1;
        
        // Process each stat
        const statsToProgress = [
          { 
            name: 'speed', 
            value: player.speed, 
            potential: player.speedPotential,
            trainerType: 'trainer_physical'
          },
          { 
            name: 'power', 
            value: player.power, 
            potential: player.powerPotential,
            trainerType: 'trainer_physical'
          },
          { 
            name: 'throwing', 
            value: player.throwing, 
            potential: player.throwingPotential,
            trainerType: 'trainer_offense'
          },
          { 
            name: 'catching', 
            value: player.catching, 
            potential: player.catchingPotential,
            trainerType: 'trainer_offense'
          },
          { 
            name: 'kicking', 
            value: player.kicking, 
            potential: player.kickingPotential,
            trainerType: 'trainer_offense'
          },
          { 
            name: 'stamina', 
            value: player.stamina, 
            potential: player.staminaPotential,
            trainerType: 'trainer_defense'
          },
          { 
            name: 'leadership', 
            value: player.leadership, 
            potential: player.leadershipPotential,
            trainerType: 'head_coach'
          },
          { 
            name: 'agility', 
            value: player.agility, 
            potential: player.agilityPotential,
            trainerType: 'trainer_offense'
          }
        ];
        
        const updates: Record<string, number> = {};
        
        for (const stat of statsToProgress) {
          const potential10 = convertPotentialTo10Point(stat.potential);
          const statCap = calculateStatCap(potential10);
          
          // Skip if already at cap
          if (stat.value >= statCap) continue;
          
          // Calculate progression chance
          let progressionChance = finalBaseChance;
          
          // Potential modifier
          if (potential10 <= 2) progressionChance += 5;        // 1 star
          else if (potential10 <= 4) progressionChance += 10;  // 2 stars
          else if (potential10 <= 6) progressionChance += 20;  // 3 stars
          else if (potential10 <= 8) progressionChance += 30;  // 4 stars
          else progressionChance += 40;                         // 5 stars
          
          // Age modifier
          if (player.age <= 23) progressionChance += 15;
          else if (player.age <= 27) progressionChance += 5;
          else if (player.age >= 31) progressionChance -= 20;
          
          // TODO: Add usage modifier based on games played
          // For now, assume average usage
          const usageModifier = 5;
          progressionChance += usageModifier;
          
          // Trainer bonus
          const relevantTrainer = trainers.find(t => t.type === stat.trainerType);
          if (relevantTrainer) {
            const trainerBonus = relevantTrainer.teaching * 0.15;
            progressionChance += trainerBonus * developmentMultiplier;
          }
          
          // Roll for progression
          if (Math.random() * 100 < progressionChance) {
            const improvement = Math.min(2, statCap - stat.value); // Max +2 per season
            updates[stat.name] = stat.value + improvement;
          }
        }
        
        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          await db
            .update(players)
            .set({
              ...updates,
              updatedAt: new Date()
            })
            .where(eq(players.id, player.id));
          
          console.log(`Player ${player.name} improved:`, updates);
        }
        
        // Age-related decline for older players
        if (player.age >= 31) {
          await applyAgeDecline(player);
        }
      }
      
      // Update team camaraderie
      if (headCoach) {
        const camaraderieIncrease = headCoach.motivation + headCoach.yearsOnTeam;
        const newCamaraderie = Math.min(100, (team.camaraderie || 50) + camaraderieIncrease);
        
        await db
          .update(teams)
          .set({
            camaraderie: newCamaraderie,
            updatedAt: new Date()
          })
          .where(eq(teams.id, team.id));
        
        console.log(`Team ${team.name} camaraderie increased to ${newCamaraderie}`);
      }
    }
    
    // Process staff progression
    await runStaffProgression();
    
  } catch (error) {
    console.error("Error in season end progression:", error);
  }
}

// Apply age-related decline
async function applyAgeDecline(player: any) {
  const declineChance = (player.age - 30) * 5; // 5% per year over 30
  
  if (Math.random() * 100 < declineChance) {
    // Physical stats decline more
    const physicalStats = ['speed', 'power', 'stamina', 'agility'];
    const statToDecline = physicalStats[Math.floor(Math.random() * physicalStats.length)];
    
    const currentValue = player[statToDecline];
    if (currentValue > 10) { // Don't go below 10
      const updateQuery = sql`
        UPDATE players 
        SET ${sql.identifier(statToDecline)} = ${sql.identifier(statToDecline)} - 1,
            updated_at = NOW()
        WHERE id = ${player.id}
      `;
      
      await pool.query(updateQuery.sql, updateQuery.values);
      console.log(`Player ${player.name} (age ${player.age}) declined: ${statToDecline} -1`);
    }
  }
}

// Staff progression
async function runStaffProgression() {
  console.log("Running staff progression...");
  
  try {
    const allStaff = await db.select().from(staff);
    
    for (const staffMember of allStaff) {
      // Get team performance
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, staffMember.teamId));
      
      if (!team) continue;
      
      // Calculate progression chance
      const teamWinPercentage = team.wins / Math.max(1, team.wins + team.losses + team.draws);
      const staffProgressChance = 10 + (teamWinPercentage * 10);
      
      // Roll for progression
      if (Math.random() * 100 < staffProgressChance) {
        // Determine which attribute to improve based on staff type
        let attributeToImprove: string;
        
        switch (staffMember.type) {
          case 'head_coach':
            const coachAttributes = ['motivation', 'tactics', 'development'];
            attributeToImprove = coachAttributes[Math.floor(Math.random() * coachAttributes.length)];
            break;
          case 'trainer_offense':
          case 'trainer_defense':
          case 'trainer_physical':
            attributeToImprove = Math.random() < 0.5 ? 'teaching' : 'specialization';
            break;
          case 'head_scout':
          case 'recruiting_scout':
            attributeToImprove = Math.random() < 0.5 ? 'talentIdentification' : 'potentialAssessment';
            break;
          case 'recovery_specialist':
            attributeToImprove = Math.random() < 0.5 ? 'physiology' : 'rehabilitation';
            break;
          default:
            continue;
        }
        
        // Apply improvement
        const currentValue = staffMember[attributeToImprove as keyof typeof staffMember] as number || 20;
        if (currentValue < 40) { // Cap at 40
          await db
            .update(staff)
            .set({
              [attributeToImprove]: currentValue + 1,
              yearsOnTeam: staffMember.yearsOnTeam + 1
            })
            .where(eq(staff.id, staffMember.id));
          
          console.log(`Staff ${staffMember.name} improved ${attributeToImprove} to ${currentValue + 1}`);
        }
      }
      
      // Staff decline for older members
      if (staffMember.age >= 55) {
        const declineChance = (staffMember.age - 54) * 10;
        if (Math.random() * 100 < declineChance) {
          // Random attribute declines
          const attributes = ['motivation', 'tactics', 'development', 'teaching', 'specialization', 
                            'talentIdentification', 'potentialAssessment', 'physiology', 'rehabilitation'];
          const relevantAttributes = attributes.filter(attr => {
            const value = staffMember[attr as keyof typeof staffMember];
            return value && typeof value === 'number' && value > 10;
          });
          
          if (relevantAttributes.length > 0) {
            const attrToDecline = relevantAttributes[Math.floor(Math.random() * relevantAttributes.length)];
            const currentValue = staffMember[attrToDecline as keyof typeof staffMember] as number;
            
            await db
              .update(staff)
              .set({
                [attrToDecline]: currentValue - 1,
                age: staffMember.age + 1
              })
              .where(eq(staff.id, staffMember.id));
            
            console.log(`Staff ${staffMember.name} (age ${staffMember.age}) declined: ${attrToDecline} -1`);
          }
        }
      } else {
        // Age staff normally
        await db
          .update(staff)
          .set({ age: staffMember.age + 1 })
          .where(eq(staff.id, staffMember.id));
      }
    }
  } catch (error) {
    console.error("Error in staff progression:", error);
  }
}

// Enhanced recovery with staff effects
export async function getEnhancedRecoveryRate(teamId: string): Promise<number> {
  const baseRecovery = 50; // Base 50 RP per day
  
  try {
    // Get recovery specialist
    const [recoverySpec] = await db
      .select()
      .from(staff)
      .where(and(
        eq(staff.teamId, teamId),
        eq(staff.type, 'recovery_specialist')
      ));
    
    if (recoverySpec) {
      // Formula: base + (physiology * 1.5)
      return baseRecovery + (recoverySpec.physiology * 1.5);
    }
  } catch (error) {
    console.error("Error getting enhanced recovery rate:", error);
  }
  
  return baseRecovery;
}