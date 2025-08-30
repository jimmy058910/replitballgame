#!/usr/bin/env node

// Direct fix for Division 8 Alpha schedule generation
import { getPrismaClient } from './server/database.js';
import pkg from './server/services/logging.js';
const { logInfo } = pkg;

async function fixAlphaSchedule() {
  try {
    logInfo('🔧 DIRECT FIX: Processing Division 8 Alpha subdivision...');
    
    const prisma = await getPrismaClient();
    
    // 1. Check current state of Division 8 Alpha
    const teamsInAlpha = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      }
    });
    
    logInfo(`Found ${teamsInAlpha.length} teams in Division 8 Alpha:`);
    teamsInAlpha.forEach(team => {
      logInfo(`  - ${team.name} (${team.isAI ? 'AI' : 'Human'})`);
    });
    
    // 2. Check existing matches
    const existingMatches = await prisma.match.findMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      }
    });
    
    logInfo(`Found ${existingMatches.length} existing matches`);
    
    // 3. Add AI teams if needed
    if (teamsInAlpha.length > 0 && teamsInAlpha.length < 8) {
      const aiNeeded = 8 - teamsInAlpha.length;
      logInfo(`Adding ${aiNeeded} AI teams to complete subdivision...`);
      
      // Create AI teams
      const raceTypes = ['Human', 'Elf', 'Dwarf', 'Orc', 'Troll'];
      const teamNames = [
        'Shadow Runners', 'Storm Breakers', 'Fire Hawks', 'Thunder Eagles',
        'Iron Wolves', 'Desert Hawks', 'Frost Giants', 'Lightning Bolts'
      ];
      
      for (let i = 0; i < aiNeeded; i++) {
        const teamName = teamNames[Math.floor(Math.random() * teamNames.length)] + ` ${500 + Math.floor(Math.random() * 500)}`;
        const race = raceTypes[Math.floor(Math.random() * raceTypes.length)];
        
        // Create AI team
        const aiTeam = await prisma.team.create({
          data: {
            name: teamName,
            race,
            division: 8,
            subdivision: 'alpha',
            isAI: true,
            userId: `ai_team_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        // Create basic AI players (simplified for speed)
        const playerNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu'];
        const roles = ['STRIKER', 'MIDFIELDER', 'DEFENDER', 'GOALKEEPER'];
        
        for (let j = 0; j < 12; j++) {
          await prisma.player.create({
            data: {
              firstName: playerNames[j] || `Player${j}`,
              lastName: teamName.split(' ')[0],
              race,
              age: 20 + Math.floor(Math.random() * 15),
              role: roles[Math.floor(Math.random() * roles.length)],
              teamId: aiTeam.id,
              speed: 50 + Math.floor(Math.random() * 40),
              power: 50 + Math.floor(Math.random() * 40),
              throwing: 50 + Math.floor(Math.random() * 40),
              catching: 50 + Math.floor(Math.random() * 40),
              kicking: 50 + Math.floor(Math.random() * 40),
              staminaAttribute: 50 + Math.floor(Math.random() * 40),
              leadership: 50 + Math.floor(Math.random() * 40),
              agility: 50 + Math.floor(Math.random() * 40),
              potentialRating: 60 + Math.floor(Math.random() * 30),
              dailyStaminaLevel: 100,
              injuryStatus: 'HEALTHY',
              injuryRecoveryPointsNeeded: 0,
              injuryRecoveryPointsCurrent: 0,
              dailyItemsUsed: [],
              careerInjuries: 0,
              gamesPlayedLastSeason: 0,
              seasonMinutesLeague: 0,
              seasonMinutesTournament: 0,
              seasonMinutesExhibition: 0,
              seasonMinutesTotal: 0,
              isOnMarket: false,
              isRetired: false,
              camaraderieScore: 50 + Math.floor(Math.random() * 40),
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
        
        logInfo(`✅ Created AI team: ${teamName}`);
      }
    }
    
    // 4. Get all teams after AI generation
    const allTeamsInAlpha = await prisma.team.findMany({
      where: {
        division: 8,
        subdivision: 'alpha'
      }
    });
    
    logInfo(`Now have ${allTeamsInAlpha.length} teams in Division 8 Alpha`);
    
    // 5. Generate shortened schedule for Days 4-14 if no matches exist
    if (allTeamsInAlpha.length === 8 && existingMatches.length === 0) {
      logInfo('Generating shortened schedule for Days 4-14...');
      
      const currentDay = 4;
      const endDay = 14;
      const remainingDays = endDay - currentDay + 1; // 11 days
      
      // Each team needs to play 11 games (one per day from Day 4 to Day 14)
      const gamesPerDay = 4; // 8 teams = 4 matches per day
      
      let createdMatches = 0;
      const matchTimes = ['16:00', '16:15', '16:30', '16:45']; // 4:00-4:45 PM EDT
      
      // Generate 1 match per team per day for Days 4-14
      for (let day = currentDay; day <= endDay; day++) {
        const shuffledTeams = [...allTeamsInAlpha].sort(() => Math.random() - 0.5);
        
        // Create 4 matches (8 teams / 2 = 4 matches per day)
        for (let matchIndex = 0; matchIndex < 4; matchIndex++) {
          const homeTeam = shuffledTeams[matchIndex * 2];
          const awayTeam = shuffledTeams[matchIndex * 2 + 1];
          
          const matchDate = new Date();
          matchDate.setDate(matchDate.getDate() + (day - 4)); // Set to the correct day
          const [hours, minutes] = matchTimes[matchIndex].split(':');
          matchDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          await prisma.match.create({
            data: {
              homeTeamId: homeTeam.id,
              awayTeamId: awayTeam.id,
              scheduledTime: matchDate,
              division: 8,
              subdivision: 'alpha',
              day: day,
              matchType: 'LEAGUE',
              status: 'SCHEDULED',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          
          createdMatches++;
        }
      }
      
      logInfo(`✅ Generated ${createdMatches} matches for Division 8 Alpha (Days 4-14)`);
    } else if (existingMatches.length > 0) {
      logInfo(`Schedule already exists with ${existingMatches.length} matches`);
    }
    
    logInfo('🎯 Division 8 Alpha processing completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in fix script:', error);
  }
}

fixAlphaSchedule().then(() => {
  logInfo('Script completed - exiting...');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});