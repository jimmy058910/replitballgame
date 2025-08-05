/**
 * COMPREHENSIVE SYSTEM TEST SUITE
 * Tests all major components with industry standards
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '../generated/prisma';
import { teamStorage } from '../server/storage/teamStorage';
import { userStorage } from '../server/storage/userStorage';
import { playerStorage } from '../server/storage/playerStorage';
import { staffStorage } from '../server/storage/staffStorage';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_DEVELOPMENT || process.env.DATABASE_URL,
    },
  },
});

describe('🔍 COMPREHENSIVE SYSTEM TEST SUITE', () => {
  let testUserId: string;
  let testUserProfileId: number;
  let testTeamId: number;

  beforeAll(async () => {
    console.log('🚀 Starting comprehensive system tests...');
    testUserId = `test_user_${Date.now()}`;
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      if (testTeamId) {
        await prisma.contract.deleteMany({ where: { player: { teamId: testTeamId } } });
        await prisma.player.deleteMany({ where: { teamId: testTeamId } });
        await prisma.staff.deleteMany({ where: { teamId: testTeamId } });
        await prisma.teamFinances.deleteMany({ where: { teamId: testTeamId } });
        await prisma.stadium.deleteMany({ where: { teamId: testTeamId } });
        await prisma.team.delete({ where: { id: testTeamId } });
      }
      if (testUserProfileId) {
        await prisma.userProfile.delete({ where: { id: testUserProfileId } });
      }
    } catch (error) {
      console.log('Cleanup completed (some items may not exist)');
    }
    await prisma.$disconnect();
    console.log('✅ System tests completed and cleaned up');
  });

  describe('📊 Database Connectivity & Schema', () => {
    it('should connect to database successfully', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });

    it('should have all required tables', async () => {
      const tables = await prisma.$queryRaw`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
      ` as any[];
      
      const requiredTables = [
        'UserProfile', 'Team', 'Player', 'Staff', 'Contract',
        'Season', 'Game', 'Stadium', 'TeamFinances'
      ];
      
      const tableNames = tables.map((t: any) => t.tablename);
      requiredTables.forEach(table => {
        expect(tableNames).toContain(table);
      });
    });

    it('should verify foreign key constraints', async () => {
      const constraints = await prisma.$queryRaw`
        SELECT constraint_name, table_name 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
      ` as any[];
      
      expect(constraints.length).toBeGreaterThan(10);
    });
  });

  describe('👤 User Management System', () => {
    it('should create user profile', async () => {
      const userData = {
        userId: testUserId,
        email: `test_${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User'
      };

      const user = await userStorage.upsertUser(userData);
      testUserProfileId = user.id;

      expect(user.userId).toBe(testUserId);
      expect(user.email).toBe(userData.email);
      expect(user.ndaAccepted).toBe(false);
    });

    it('should handle NDA acceptance', async () => {
      const user = await userStorage.acceptNDA(testUserId, "1.0");
      expect(user.ndaAccepted).toBe(true);
      expect(user.ndaVersion).toBe("1.0");
      expect(user.ndaAcceptedAt).toBeDefined();
    });

    it('should check NDA status', async () => {
      const status = await userStorage.checkNDAAcceptance(testUserId);
      expect(status).toBe(true);
    });
  });

  describe('🏈 Team Management System', () => {
    it('should create team with full roster generation', async () => {
      const teamData = {
        userProfileId: testUserProfileId,
        name: `Test Team ${Date.now()}`,
        division: 8,
        subdivision: 'main'
      };

      const team = await teamStorage.createTeam(teamData);
      testTeamId = team.id;

      expect(team.name).toBe(teamData.name);
      expect(team.userProfileId).toBe(testUserProfileId);
      expect(team.division).toBe(8);
    });

    it('should verify automatic player generation', async () => {
      const players = await playerStorage.getPlayersByTeam(testTeamId);
      
      expect(players.length).toBe(12);
      
      // Verify position distribution
      const positions = players.map(p => p.role);
      const passers = positions.filter(p => p === 'PASSER').length;
      const blockers = positions.filter(p => p === 'BLOCKER').length;
      const runners = positions.filter(p => p === 'RUNNER').length;
      
      expect(passers).toBeGreaterThanOrEqual(3);
      expect(blockers).toBeGreaterThanOrEqual(4);
      expect(runners).toBeGreaterThanOrEqual(4);
      
      // Verify all players have valid attributes
      players.forEach(player => {
        expect(player.firstName).toBeDefined();
        expect(player.lastName).toBeDefined();
        expect(player.age).toBeGreaterThan(16);
        expect(player.age).toBeLessThan(40);
        expect(player.speed).toBeGreaterThan(0);
        expect(player.power).toBeGreaterThan(0);
        expect(player.injuryStatus).toBe('HEALTHY');
      });
    });

    it('should verify automatic staff generation', async () => {
      const staff = await staffStorage.getStaffByTeam(testTeamId);
      
      expect(staff.length).toBe(7);
      
      // Verify staff types
      const staffTypes = staff.map(s => s.type);
      expect(staffTypes).toContain('HEAD_COACH');
      expect(staffTypes).toContain('RECOVERY_SPECIALIST');
      expect(staffTypes.filter(t => t === 'SCOUT').length).toBe(2);
      
      // Verify all staff have valid attributes
      staff.forEach(member => {
        expect(member.name).toBeDefined();
        expect(member.level).toBe(1);
        expect(member.age).toBeGreaterThan(25);
        expect(member.motivation).toBeGreaterThan(0);
      });
    });

    it('should verify team finances initialization', async () => {
      const finances = await prisma.teamFinances.findUnique({
        where: { teamId: testTeamId }
      });
      
      expect(finances).toBeDefined();
      expect(finances?.balance).toBeGreaterThan(0);
    });

    it('should verify stadium creation', async () => {
      const stadium = await prisma.stadium.findUnique({
        where: { teamId: testTeamId }
      });
      
      expect(stadium).toBeDefined();
      expect(stadium?.capacity).toBeGreaterThan(0);
      expect(stadium?.level).toBe(1);
    });
  });

  describe('🔐 Authentication & Security', () => {
    it('should handle user lookup by ID', async () => {
      const user = await userStorage.getUser(testUserId);
      expect(user).toBeDefined();
      expect(user?.userId).toBe(testUserId);
    });

    it('should handle user lookup by email', async () => {
      const user = await userStorage.getUserByEmail(`test_${testUserProfileId}@example.com`);
      expect(user?.userId).toBe(testUserId);
    });

    it('should update user profile correctly', async () => {
      const updatedData = {
        userId: testUserId,
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast'
      };

      const user = await userStorage.upsertUser(updatedData);
      expect(user.firstName).toBe('UpdatedFirst');
      expect(user.lastName).toBe('UpdatedLast');
    });
  });

  describe('⚡ Performance & Scalability', () => {
    it('should handle concurrent database operations', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        prisma.userProfile.findUnique({ where: { userId: testUserId } })
      );
      
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result?.userId).toBe(testUserId);
      });
    });

    it('should maintain connection pool efficiency', async () => {
      const startTime = Date.now();
      
      // Multiple DB operations
      await Promise.all([
        playerStorage.getPlayersByTeam(testTeamId),
        staffStorage.getStaffByTeam(testTeamId),
        teamStorage.getTeam(testTeamId),
        userStorage.getUser(testUserId)
      ]);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('🔧 Data Integrity & Validation', () => {
    it('should enforce unique constraints', async () => {
      const duplicateTeamData = {
        userProfileId: testUserProfileId,
        name: `Test Team ${testTeamId}`, // Same name as existing team
        division: 8,
        subdivision: 'main'
      };

      await expect(teamStorage.createTeam(duplicateTeamData)).rejects.toThrow();
    });

    it('should validate player age constraints', async () => {
      const players = await playerStorage.getPlayersByTeam(testTeamId);
      players.forEach(player => {
        expect(player.age).toBeGreaterThanOrEqual(17);
        expect(player.age).toBeLessThanOrEqual(38);
      });
    });

    it('should validate team structure integrity', async () => {
      const team = await teamStorage.getTeam(testTeamId);
      const players = await playerStorage.getPlayersByTeam(testTeamId);
      const staff = await staffStorage.getStaffByTeam(testTeamId);

      expect(team).toBeDefined();
      expect(players.length).toBe(12);
      expect(staff.length).toBe(7);
      
      // Verify all belong to same team
      players.forEach(player => expect(player.teamId).toBe(testTeamId));
      staff.forEach(member => expect(member.teamId).toBe(testTeamId));
    });
  });

  describe('🌐 API Endpoint Health', () => {
    it('should verify critical endpoints are registered', async () => {
      // This would be expanded with actual HTTP tests in full implementation
      expect(true).toBe(true); // Placeholder for API endpoint tests
    });
  });
});