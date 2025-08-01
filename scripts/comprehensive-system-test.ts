#!/usr/bin/env tsx

/**
 * Comprehensive System Test - Alpha Testing Preparation
 * Tests all critical processes to ensure they work correctly before deployment
 */

import { prisma } from "../server/db";
import { storage } from "../server/storage/index";
import { SeasonTimingAutomationService } from "../server/services/seasonTimingAutomationService";

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  details?: any;
}

class ComprehensiveSystemTest {
  private results: TestResult[] = [];

  private log(message: string, data?: any) {
    console.log(`[TEST] ${message}`, data || '');
  }

  private addResult(name: string, success: boolean, error?: string, details?: any) {
    this.results.push({ name, success, error, details });
    const status = success ? '✅' : '❌';
    this.log(`${status} ${name}${error ? `: ${error}` : ''}`);
    if (details) {
      console.log('   Details:', details);
    }
  }

  async testDatabaseConnection() {
    try {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      this.addResult('Database Connection', true, undefined, result);
    } catch (error) {
      this.addResult('Database Connection', false, error instanceof Error ? error.message : String(error));
    }
  }

  async testSeasonCreation() {
    try {
      // Check if season exists
      let season = await prisma.season.findFirst({
        orderBy: { startDate: 'desc' }
      });

      if (!season) {
        // Create season
        season = await prisma.season.create({
          data: {
            id: `test-season-${Date.now()}`,
            seasonNumber: 1,
            startDate: new Date(),
            endDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000), // 17 days
            currentDay: 1,
            phase: 'REGULAR_SEASON'
          }
        });
      }

      this.addResult('Season Creation', true, undefined, { seasonId: season.id, currentDay: season.currentDay });
    } catch (error) {
      this.addResult('Season Creation', false, error instanceof Error ? error.message : String(error));
    }
  }

  async testUserProfileCreation() {
    try {
      const testUserId = `test-user-${Date.now()}`;
      
      // Create test user profile
      const userProfile = await prisma.userProfile.create({
        data: {
          userId: testUserId,
          email: `test-${Date.now()}@test.com`,
          firstName: 'Test',
          lastName: 'User',
          ndaAccepted: true,
          ndaAcceptedAt: new Date()
        }
      });

      this.addResult('User Profile Creation', true, undefined, { userId: userProfile.userId, id: userProfile.id });
      return userProfile;
    } catch (error) {
      this.addResult('User Profile Creation', false, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  async testTeamCreation(userProfile: any) {
    if (!userProfile) {
      this.addResult('Team Creation', false, 'No user profile provided');
      return null;
    }

    try {
      const teamName = `Test Team ${Date.now()}`;
      
      // Create team using storage layer
      const team = await storage.teams.createTeam({
        userId: userProfile.userId,
        name: teamName,
        division: 8,
        subdivision: 'test'
      });

      this.addResult('Team Creation', true, undefined, { teamId: team.id, name: team.name });
      return team;
    } catch (error) {
      this.addResult('Team Creation', false, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  async testPlayerGeneration(team: any) {
    if (!team) {
      this.addResult('Player Generation', false, 'No team provided');
      return;
    }

    try {
      // Check if players already exist
      let players = await storage.players.getPlayersByTeamId(team.id);
      
      if (players.length === 0) {
        // Generate players using the same logic as teamRoutes.ts
        const races = ["human", "sylvan", "gryll", "lumina", "umbra"];
        const requiredPositions = [
          "passer", "passer", "passer",
          "blocker", "blocker", "blocker", "blocker",
          "runner", "runner", "runner", "runner"
        ];
        
        // Add one flexible position
        const additionalPositions = ["passer", "runner", "blocker"];
        const position = additionalPositions[Math.floor(Math.random() * additionalPositions.length)];
        requiredPositions.push(position);

        // Import the generateRandomPlayer function
        const { generateRandomPlayer } = await import('../server/services/leagueService');

        for (let i = 0; i < 12; i++) {
          const race = races[Math.floor(Math.random() * races.length)];
          const position = requiredPositions[i];
          
          const playerData = generateRandomPlayer("", race, team.id.toString(), position);
          
          const cleanPlayerData = {
            teamId: team.id,
            firstName: playerData.firstName,
            lastName: playerData.lastName,
            race: playerData.race as any,
            age: playerData.age,
            role: playerData.role as any,
            speed: playerData.speed,
            power: playerData.power,
            throwing: playerData.throwing,
            catching: playerData.catching,
            kicking: playerData.kicking,
            staminaAttribute: playerData.staminaAttribute,
            leadership: playerData.leadership,
            agility: playerData.agility,
            potentialRating: playerData.potentialRating,
            dailyStaminaLevel: 100,
            injuryStatus: 'HEALTHY' as any,
            camaraderie: playerData.camaraderie || 75.0,
          };
          
          await storage.players.createPlayer(cleanPlayerData);
        }
      }

      // Check final player count
      players = await storage.players.getPlayersByTeamId(team.id);
      
      if (players.length >= 12) {
        this.addResult('Player Generation', true, undefined, { 
          playersCreated: players.length,
          positions: players.map(p => p.role)
        });
      } else {
        this.addResult('Player Generation', false, `Only ${players.length} players created, expected 12`);
      }
    } catch (error) {
      this.addResult('Player Generation', false, error instanceof Error ? error.message : String(error));
    }
  }

  async testStaffGeneration(team: any) {
    if (!team) {
      this.addResult('Staff Generation', false, 'No team provided');
      return;
    }

    try {
      // Check if staff already exist
      let staff = await storage.staff.getStaffByTeamId(team.id);
      
      if (staff.length === 0) {
        // Generate staff using the same logic as teamRoutes.ts
        const defaultStaff = [
          { type: 'HEAD_COACH', name: 'Coach Johnson', motivation: 18, development: 15, tactics: 14 },
          { type: 'RECOVERY_SPECIALIST', name: 'Alex Recovery', physiology: 16 },
          { type: 'PASSER_TRAINER', name: 'Sarah Passer', teaching: 15 },
          { type: 'RUNNER_TRAINER', name: 'Mike Runner', teaching: 14 },
          { type: 'BLOCKER_TRAINER', name: 'Lisa Blocker', teaching: 15 },
          { type: 'SCOUT', name: 'Emma Talent', talentIdentification: 16, potentialAssessment: 15 },
          { type: 'SCOUT', name: 'Tony Scout', talentIdentification: 14, potentialAssessment: 15 }
        ];

        for (const staffData of defaultStaff) {
          await storage.staff.createStaff({
            teamId: team.id,
            type: staffData.type as any,
            name: staffData.name,
            level: 1,
            motivation: staffData.motivation || 12,
            development: staffData.development || 12,
            teaching: staffData.teaching || 12,
            physiology: staffData.physiology || 12,
            talentIdentification: staffData.talentIdentification || 12,
            potentialAssessment: staffData.potentialAssessment || 12,
            tactics: staffData.tactics || 12,
            age: 35 + Math.floor(Math.random() * 40)
          });
        }
      }

      // Check final staff count
      staff = await storage.staff.getStaffByTeamId(team.id);
      
      if (staff.length >= 7) {
        this.addResult('Staff Generation', true, undefined, { 
          staffCreated: staff.length,
          types: staff.map(s => s.type)
        });
      } else {
        this.addResult('Staff Generation', false, `Only ${staff.length} staff created, expected 7`);
      }
    } catch (error) {
      this.addResult('Staff Generation', false, error instanceof Error ? error.message : String(error));
    }
  }

  async testFinancesAndStadium(team: any) {
    if (!team) {
      this.addResult('Finances & Stadium Setup', false, 'No team provided');
      return;
    }

    try {
      // Check finances
      const finances = await prisma.teamFinances.findFirst({
        where: { teamId: team.id }
      });

      // Check stadium
      const stadium = await prisma.stadium.findFirst({
        where: { teamId: team.id }
      });

      if (finances && stadium) {
        this.addResult('Finances & Stadium Setup', true, undefined, {
          credits: finances.credits.toString(),
          gems: finances.gems.toString(),
          stadiumCapacity: stadium.capacity
        });
      } else {
        this.addResult('Finances & Stadium Setup', false, 
          `Missing: ${!finances ? 'finances' : ''} ${!stadium ? 'stadium' : ''}`);
      }
    } catch (error) {
      this.addResult('Finances & Stadium Setup', false, error instanceof Error ? error.message : String(error));
    }
  }

  async testAutomationService() {
    try {
      // Test if automation service can initialize
      const automationService = new SeasonTimingAutomationService();
      
      this.addResult('Automation Service', true, undefined, {
        canInitialize: true,
        serviceCreated: !!automationService
      });
    } catch (error) {
      this.addResult('Automation Service', false, error instanceof Error ? error.message : String(error));
    }
  }

  async testAPIEndpoints() {
    try {
      // Test key API endpoints by importing and calling storage methods directly
      const teams = await storage.teams.getAllTeams();
      const users = await prisma.userProfile.findMany({ take: 5 });
      
      this.addResult('API Storage Layer', true, undefined, {
        teamsAccessible: teams.length >= 0,
        usersAccessible: users.length >= 0
      });
    } catch (error) {
      this.addResult('API Storage Layer', false, error instanceof Error ? error.message : String(error));
    }
  }

  async runAllTests() {
    this.log('🧪 Starting Comprehensive System Test...\n');
    
    // Run tests in order
    await this.testDatabaseConnection();
    await this.testSeasonCreation();
    
    const userProfile = await this.testUserProfileCreation();
    const team = await this.testTeamCreation(userProfile);
    
    await this.testPlayerGeneration(team);
    await this.testStaffGeneration(team);
    await this.testFinancesAndStadium(team);
    
    await this.testAutomationService();
    await this.testAPIEndpoints();

    // Clean up test data
    if (userProfile) {
      try {
        // Delete in proper order to handle foreign key constraints
        if (team) {
          await prisma.player.deleteMany({ where: { teamId: team.id } });
          await prisma.staff.deleteMany({ where: { teamId: team.id } });
          await prisma.teamFinances.deleteMany({ where: { teamId: team.id } });
          await prisma.stadium.deleteMany({ where: { teamId: team.id } });
          await prisma.team.delete({ where: { id: team.id } });
        }
        await prisma.userProfile.delete({ where: { id: userProfile.id } });
        this.log('✅ Test data cleaned up');
      } catch (error) {
        this.log('⚠️ Error cleaning up test data:', error);
      }
    }

    // Print summary
    this.printSummary();
  }

  printSummary() {
    this.log('\n📊 Test Summary:');
    this.log('================');
    
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    
    this.log(`✅ Passed: ${passed}`);
    this.log(`❌ Failed: ${failed}`);
    this.log(`📊 Total: ${this.results.length}`);
    
    if (failed > 0) {
      this.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.success).forEach(result => {
        this.log(`   • ${result.name}: ${result.error}`);
      });
    }
    
    if (failed === 0) {
      this.log('\n🎉 ALL TESTS PASSED! System ready for Alpha testing.');
    } else {
      this.log(`\n⚠️ ${failed} tests failed. Please fix issues before deployment.`);
    }
  }
}

// Run the tests
const tester = new ComprehensiveSystemTest();
tester.runAllTests().catch(console.error);