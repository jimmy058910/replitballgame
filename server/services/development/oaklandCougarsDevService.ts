import { getPrismaClient } from '../../database.js';
import { logger } from '../../utils/logger.js';
import { ServiceError } from '../../utils/ServiceError.js';
import type { Team, UserProfile } from '@shared/types/models';

/**
 * OaklandCougarsDevService
 * 
 * Consolidates all Oakland Cougars-specific development logic.
 * This service handles the hardcoded development team fixtures and
 * provides clean interfaces for development environment setup.
 * 
 * IMPORTANT: This service should only be used in development environments.
 * All methods check NODE_ENV and throw errors in production.
 */
export class OaklandCougarsDevService {
  
  /**
   * Ensures the service is only used in development
   */
  private static ensureDevelopment(): void {
    if (process.env.NODE_ENV !== 'development') {
      throw new ServiceError('OaklandCougarsDevService is only available in development environment');
    }
  }

  /**
   * Finds Oakland Cougars team across all Greek alphabet subdivisions
   * This replaces the hardcoded logic from UserSubdivisionService
   * 
   * @param division - The division to search in
   * @returns Oakland Cougars team if found, null otherwise
   */
  static async findOaklandCougarsAcrossSubdivisions(division: number): Promise<Team | null> {
    this.ensureDevelopment();
    
    try {
      const prisma = await getPrismaClient();
      
      logger.info('Searching all subdivisions for Oakland Cougars (dev mode)', { division });

      const subdivisions = ['alpha', 'beta', 'gamma', 'main', 'delta', 'epsilon'];
      
      for (const subdivision of subdivisions) {
        const teams = await prisma.team.findMany({
          where: { 
            division,
            subdivision 
          }
        });
        
        const oaklandTeam = teams.find(team => team.name.includes('Oakland Cougars'));
        
        if (oaklandTeam) {
          logger.info('Oakland Cougars found in subdivision', { 
            subdivision, 
            teamId: oaklandTeam.id,
            teamName: oaklandTeam.name 
          });
          return oaklandTeam as Team;
        }
      }
      
      logger.warn('Oakland Cougars not found in any subdivision', { division });
      return null;
      
    } catch (error) {
      logger.error('Error finding Oakland Cougars across subdivisions', { error, division });
      throw new ServiceError('Failed to find Oakland Cougars team', error);
    }
  }

  /**
   * Creates or updates the development UserProfile for Oakland Cougars
   * This replaces the hardcoded logic from the dev-setup-test-user endpoint
   * 
   * @returns Created or updated UserProfile
   */
  static async createDevUserProfile(): Promise<UserProfile> {
    this.ensureDevelopment();
    
    try {
      const prisma = await getPrismaClient();
      
      logger.info('Creating/updating development UserProfile for Oakland Cougars');
      
      const userProfile = await prisma.userProfile.upsert({
        where: { firebaseUid: 'oakland-cougars-owner' },
        create: {
          firebaseUid: 'oakland-cougars-owner',
          email: 'oakland.cougars@realmrivalry.dev',
          displayName: 'Oakland Cougars Owner (Dev)',
          isActive: true
        },
        update: {
          email: 'oakland.cougars@realmrivalry.dev',
          displayName: 'Oakland Cougars Owner (Dev)',
          isActive: true
        }
      });
      
      logger.info('Development UserProfile created/updated', { 
        userProfileId: userProfile.id,
        firebaseUid: userProfile.firebaseUid 
      });
      
      return userProfile as UserProfile;
      
    } catch (error) {
      logger.error('Error creating development UserProfile', { error });
      throw new ServiceError('Failed to create development UserProfile', error);
    }
  }

  /**
   * Links Oakland Cougars team to the development UserProfile
   * This provides a clean interface for the dev user setup process
   * 
   * @param userProfile - The UserProfile to link to
   * @returns Updated Oakland Cougars team
   */
  static async linkDevUserToOaklandCougars(userProfile: UserProfile): Promise<Team> {
    this.ensureDevelopment();
    
    try {
      const prisma = await getPrismaClient();
      
      logger.info('Linking Oakland Cougars to development UserProfile', { 
        userProfileId: userProfile.id 
      });
      
      // Find Oakland Cougars team (hardcoded for development)
      const oaklandCougars = await prisma.team.findFirst({
        where: { 
          name: 'Oakland Cougars', 
          division: 7, 
          subdivision: 'alpha' 
        }
      });
      
      if (!oaklandCougars) {
        throw new ServiceError('Oakland Cougars team not found in expected location (division 7, alpha)');
      }
      
      // Link the team to the UserProfile
      const updatedTeam = await prisma.team.update({
        where: { id: oaklandCougars.id },
        data: { userProfileId: userProfile.id }
      });
      
      logger.info('Oakland Cougars linked to development UserProfile', { 
        teamId: updatedTeam.id,
        userProfileId: userProfile.id 
      });
      
      return updatedTeam as Team;
      
    } catch (error) {
      logger.error('Error linking Oakland Cougars to development UserProfile', { error });
      throw new ServiceError('Failed to link Oakland Cougars to development UserProfile', error);
    }
  }

  /**
   * Checks if a game involves the Oakland Cougars team
   * This replaces scattered Oakland Cougars game checking logic
   * 
   * @param gameId - The game ID to check
   * @returns True if Oakland Cougars is involved in the game
   */
  static async isOaklandCougarsGame(gameId: number): Promise<boolean> {
    this.ensureDevelopment();
    
    try {
      const prisma = await getPrismaClient();
      
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          homeTeam: true,
          awayTeam: true
        }
      });
      
      if (!game) {
        return false;
      }
      
      const isOaklandGame = 
        game.homeTeam.name.includes('Oakland Cougars') || 
        game.awayTeam.name.includes('Oakland Cougars');
      
      if (isOaklandGame) {
        logger.info('Oakland Cougars game detected', { 
          gameId,
          homeTeam: game.homeTeam.name,
          awayTeam: game.awayTeam.name 
        });
      }
      
      return isOaklandGame;
      
    } catch (error) {
      logger.error('Error checking if Oakland Cougars game', { error, gameId });
      throw new ServiceError('Failed to check Oakland Cougars game status', error);
    }
  }

  /**
   * Gets the current development setup status for Oakland Cougars
   * Useful for debugging and validation
   * 
   * @returns Status information about Oakland Cougars development setup
   */
  static async getDevSetupStatus(): Promise<{
    hasUserProfile: boolean;
    hasTeamLink: boolean;
    teamInfo?: Team;
    userProfileInfo?: UserProfile;
  }> {
    this.ensureDevelopment();
    
    try {
      const prisma = await getPrismaClient();
      
      // Check for UserProfile
      const userProfile = await prisma.userProfile.findUnique({
        where: { firebaseUid: 'oakland-cougars-owner' }
      });
      
      // Check for Oakland Cougars team
      const oaklandTeam = await prisma.team.findFirst({
        where: { 
          name: 'Oakland Cougars', 
          division: 7, 
          subdivision: 'alpha' 
        },
        include: {
          userProfile: true
        }
      });
      
      return {
        hasUserProfile: !!userProfile,
        hasTeamLink: !!(oaklandTeam?.userProfileId),
        teamInfo: oaklandTeam as Team | undefined,
        userProfileInfo: userProfile as UserProfile | undefined
      };
      
    } catch (error) {
      logger.error('Error getting Oakland Cougars development setup status', { error });
      throw new ServiceError('Failed to get development setup status', error);
    }
  }

  /**
   * Complete development setup for Oakland Cougars
   * This is the main entry point that replaces the scattered setup logic
   * 
   * @returns Complete setup information
   */
  static async performCompleteDevSetup(): Promise<{
    userProfile: UserProfile;
    team: Team;
    message: string;
    authToken: string;
  }> {
    this.ensureDevelopment();
    
    try {
      logger.info('Starting complete Oakland Cougars development setup');
      
      // Step 1: Create/update UserProfile
      const userProfile = await this.createDevUserProfile();
      
      // Step 2: Link to Oakland Cougars team
      const team = await this.linkDevUserToOaklandCougars(userProfile);
      
      logger.info('Complete Oakland Cougars development setup finished', {
        userProfileId: userProfile.id,
        teamId: team.id
      });
      
      return {
        userProfile,
        team,
        message: 'Oakland Cougars development setup completed successfully',
        authToken: 'dev-token-oakland-cougars'
      };
      
    } catch (error) {
      logger.error('Error during complete Oakland Cougars development setup', { error });
      throw new ServiceError('Failed to complete Oakland Cougars development setup', error);
    }
  }
}