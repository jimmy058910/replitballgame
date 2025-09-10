import { getPrismaClient } from '../../database.js';
import logger from '../../utils/logger.js';
import { AppError } from '../errorService.js';
import type { Team, UserProfile, Player } from '@shared/types/models';

/**
 * DevSeedDataService
 * 
 * Provides standardized development seed data creation and management.
 * This service replaces hardcoded development fixtures with a proper
 * data seeding system for testing and development.
 * 
 * IMPORTANT: This service should only be used in development environments.
 */
export class DevSeedDataService {
  
  /**
   * Ensures the service is only used in development
   */
  private static ensureDevelopment(): void {
    if (process.env.NODE_ENV !== 'development') {
      throw new AppError('DevSeedDataService is only available in development environment');
    }
  }

  /**
   * Creates standardized development teams with proper UserProfile associations
   * 
   * @param options - Configuration for team creation
   * @returns Array of created teams with their UserProfiles
   */
  static async createDevelopmentTeams(options: {
    division: number;
    subdivision: string;
    count?: number;
    prefix?: string;
  }): Promise<Array<{ team: Team; userProfile: UserProfile }>> {
    this.ensureDevelopment();
    
    try {
      const prisma = await getPrismaClient();
      const { division, subdivision, count = 3, prefix = 'Dev Team' } = options;
      
      logger.info('Creating development teams', { 
        division, 
        subdivision, 
        count, 
        prefix 
      });

      const results: Array<{ team: Team; userProfile: UserProfile }> = [];

      for (let i = 1; i <= count; i++) {
        const teamName = `${prefix} ${i}`;
        const firebaseUid = `dev-team-${division}-${subdivision}-${i}`;
        const email = `${teamName.toLowerCase().replace(/\s+/g, '.')}@realmrivalry.dev`;

        // Create UserProfile first
        const userProfile = await prisma.userProfile.upsert({
          where: { firebaseUid },
          create: {
            firebaseUid,
            email,
            displayName: `${teamName} Owner (Dev)`,
            firstName: 'Development',
            lastName: `Owner ${i}`,
            isActive: true
          },
          update: {
            email,
            displayName: `${teamName} Owner (Dev)`,
            isActive: true
          }
        });

        // Create team linked to UserProfile
        const team = await prisma.team.upsert({
          where: { 
            name_division_subdivision: {
              name: teamName,
              division,
              subdivision
            }
          },
          create: {
            name: teamName,
            division,
            subdivision,
            userProfileId: userProfile.id,
            credits: 1000000, // 1M credits for development
            isActive: true,
            race: 'Human' // Default race
          },
          update: {
            userProfileId: userProfile.id,
            credits: 1000000,
            isActive: true
          }
        });

        results.push({
          team: team as Team,
          userProfile: userProfile as UserProfile
        });

        logger.info('Development team created', {
          teamId: team.id,
          teamName: team.name,
          userProfileId: userProfile.id,
          firebaseUid: userProfile.firebaseUid
        });
      }

      return results;

    } catch (error) {
      logger.error('Error creating development teams', { error, options });
      throw new AppError('Failed to create development teams', error);
    }
  }

  /**
   * Creates a complete development league structure
   * 
   * @param options - Configuration for league creation
   */
  static async createDevelopmentLeague(options: {
    division: number;
    subdivisions?: string[];
    teamsPerSubdivision?: number;
  }): Promise<{
    totalTeams: number;
    subdivisions: Array<{
      name: string;
      teams: Array<{ team: Team; userProfile: UserProfile }>;
    }>;
  }> {
    this.ensureDevelopment();
    
    try {
      const { 
        division, 
        subdivisions = ['alpha', 'beta', 'gamma'], 
        teamsPerSubdivision = 8 
      } = options;

      logger.info('Creating development league structure', {
        division,
        subdivisions,
        teamsPerSubdivision
      });

      const result = {
        totalTeams: 0,
        subdivisions: [] as Array<{
          name: string;
          teams: Array<{ team: Team; userProfile: UserProfile }>;
        }>
      };

      for (const subdivision of subdivisions) {
        const teams = await this.createDevelopmentTeams({
          division,
          subdivision,
          count: teamsPerSubdivision,
          prefix: `${subdivision.charAt(0).toUpperCase() + subdivision.slice(1)} Team`
        });

        result.subdivisions.push({
          name: subdivision,
          teams
        });

        result.totalTeams += teams.length;
      }

      logger.info('Development league structure created', {
        division,
        totalTeams: result.totalTeams,
        subdivisions: result.subdivisions.length
      });

      return result;

    } catch (error) {
      logger.error('Error creating development league', { error, options });
      throw new AppError('Failed to create development league', error);
    }
  }

  /**
   * Creates development players for a team
   * 
   * @param teamId - The team ID to create players for
   * @param count - Number of players to create
   */
  static async createDevelopmentPlayers(teamId: number, count: number = 6): Promise<Player[]> {
    this.ensureDevelopment();
    
    try {
      const prisma = await getPrismaClient();
      
      // Get team info for naming context
      const team = await prisma.team.findUnique({
        where: { id: teamId }
      });

      if (!team) {
        throw new AppError(`Team with ID ${teamId} not found`);
      }

      logger.info('Creating development players', { teamId, teamName: team.name, count });

      const races = ['Human', 'Elf', 'Dwarf', 'Orc', 'Goblin'];
      const positions = ['Passer', 'Runner', 'Blocker'];
      const players: Player[] = [];

      for (let i = 1; i <= count; i++) {
        const position = positions[(i - 1) % positions.length];
        const race = races[Math.floor(Math.random() * races.length)];
        
        const player = await prisma.player.create({
          data: {
            firstName: `Dev${position}`,
            lastName: `${i}`,
            teamId,
            position,
            race,
            age: 20 + Math.floor(Math.random() * 10), // 20-29 years old
            salary: 50000 + Math.floor(Math.random() * 50000), // 50k-100k salary
            skills: {
              passing: 50 + Math.floor(Math.random() * 30),
              running: 50 + Math.floor(Math.random() * 30),
              blocking: 50 + Math.floor(Math.random() * 30),
              catching: 50 + Math.floor(Math.random() * 30),
              tackling: 50 + Math.floor(Math.random() * 30),
              dodging: 50 + Math.floor(Math.random() * 30)
            },
            isActive: true
          }
        });

        players.push(player as Player);
      }

      logger.info('Development players created', { 
        teamId, 
        teamName: team.name, 
        playersCreated: players.length 
      });

      return players;

    } catch (error) {
      logger.error('Error creating development players', { error, teamId, count });
      throw new AppError('Failed to create development players', error);
    }
  }

  /**
   * Creates a complete development environment with teams, players, and fixtures
   * 
   * @param options - Configuration for complete setup
   */
  static async createCompleteDevEnvironment(options: {
    division?: number;
    includeOaklandCougars?: boolean;
    createPlayers?: boolean;
  } = {}): Promise<{
    message: string;
    teams: number;
    players: number;
    oaklandCougarsSetup?: boolean;
  }> {
    this.ensureDevelopment();
    
    try {
      const { 
        division = 8, 
        includeOaklandCougars = true, 
        createPlayers = true 
      } = options;

      logger.info('Creating complete development environment', options);

      let totalTeams = 0;
      let totalPlayers = 0;
      let oaklandCougarsSetup = false;

      // Create development league structure
      const league = await this.createDevelopmentLeague({
        division,
        subdivisions: ['alpha', 'beta'],
        teamsPerSubdivision: 4
      });

      totalTeams = league.totalTeams;

      // Create players for all teams if requested
      if (createPlayers) {
        for (const subdivision of league.subdivisions) {
          for (const { team } of subdivision.teams) {
            const players = await this.createDevelopmentPlayers(team.id, 6);
            totalPlayers += players.length;
          }
        }
      }

      // Setup Oakland Cougars if requested
      if (includeOaklandCougars) {
        const { OaklandCougarsDevService } = await import('./oaklandCougarsDevService.js');
        await OaklandCougarsDevService.performCompleteDevSetup();
        oaklandCougarsSetup = true;
      }

      const result = {
        message: 'Complete development environment created successfully',
        teams: totalTeams,
        players: totalPlayers,
        ...(oaklandCougarsSetup && { oaklandCougarsSetup })
      };

      logger.info('Complete development environment created', result);
      return result;

    } catch (error) {
      logger.error('Error creating complete development environment', { error, options });
      throw new AppError('Failed to create complete development environment', error);
    }
  }

  /**
   * Cleans up development data (removes all dev-created teams and users)
   * 
   * @param options - Cleanup configuration
   */
  static async cleanupDevelopmentData(options: {
    division?: number;
    dryRun?: boolean;
  } = {}): Promise<{
    message: string;
    teamsRemoved: number;
    userProfilesRemoved: number;
    playersRemoved: number;
  }> {
    this.ensureDevelopment();
    
    try {
      const { division, dryRun = false } = options;
      
      const prisma = await getPrismaClient();
      
      logger.info('Starting development data cleanup', { division, dryRun });

      // Find development user profiles (those with dev emails)
      const devUserProfiles = await prisma.userProfile.findMany({
        where: {
          email: {
            contains: '@realmrivalry.dev'
          }
        },
        include: {
          teams: {
            include: {
              players: true
            }
          }
        }
      });

      let teamsToRemove = 0;
      let userProfilesToRemove = devUserProfiles.length;
      let playersToRemove = 0;

      // Count what would be removed
      for (const userProfile of devUserProfiles) {
        for (const team of userProfile.teams) {
          if (!division || team.division === division) {
            teamsToRemove++;
            playersToRemove += team.players.length;
          }
        }
      }

      if (!dryRun) {
        // Remove players first (due to foreign key constraints)
        for (const userProfile of devUserProfiles) {
          for (const team of userProfile.teams) {
            if (!division || team.division === division) {
              await prisma.player.deleteMany({
                where: { teamId: team.id }
              });
            }
          }
        }

        // Remove teams
        for (const userProfile of devUserProfiles) {
          await prisma.team.deleteMany({
            where: {
              userProfileId: userProfile.id,
              ...(division && { division })
            }
          });
        }

        // Remove user profiles that no longer have teams
        for (const userProfile of devUserProfiles) {
          const remainingTeams = await prisma.team.count({
            where: { userProfileId: userProfile.id }
          });

          if (remainingTeams === 0) {
            await prisma.userProfile.delete({
              where: { id: userProfile.id }
            });
          }
        }
      }

      const result = {
        message: dryRun ? 'Development data cleanup simulation completed' : 'Development data cleanup completed',
        teamsRemoved: teamsToRemove,
        userProfilesRemoved: userProfilesToRemove,
        playersRemoved: playersToRemove
      };

      logger.info('Development data cleanup completed', result);
      return result;

    } catch (error) {
      logger.error('Error during development data cleanup', { error, options });
      throw new AppError('Failed to cleanup development data', error);
    }
  }
}