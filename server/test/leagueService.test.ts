import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateRandomPlayer, calculatePlayerValue, processEndOfSeasonSkillProgression } from '../services/leagueService';

// Mock the storage import
vi.mock('../storage/index', () => ({
  storage: {
    getPlayerById: vi.fn(),
    updatePlayer: vi.fn(),
  }
}));

describe('leagueService', () => {
  describe('generateRandomPlayer', () => {
    it('should generate a player with correct basic structure', () => {
      const player = generateRandomPlayer('Test Player', 'human', 'team123');
      
      expect(player).toHaveProperty('name', 'Test Player');
      expect(player).toHaveProperty('race', 'human');
      expect(player).toHaveProperty('teamId', 'team123');
      expect(player).toHaveProperty('age');
      expect(player).toHaveProperty('speed');
      expect(player).toHaveProperty('power');
      expect(player).toHaveProperty('throwing');
      expect(player).toHaveProperty('catching');
      expect(player).toHaveProperty('kicking');
      expect(player).toHaveProperty('stamina');
      expect(player).toHaveProperty('leadership');
      expect(player).toHaveProperty('agility');
    });

    it('should apply racial modifiers correctly for human players', () => {
      const player = generateRandomPlayer('Human Player', 'human', 'team123');
      
      // Human players get +1 to all stats, so minimum should be 4 (3 base + 1 racial)
      expect(player.speed).toBeGreaterThanOrEqual(4);
      expect(player.power).toBeGreaterThanOrEqual(4);
      expect(player.throwing).toBeGreaterThanOrEqual(4);
      expect(player.catching).toBeGreaterThanOrEqual(4);
      expect(player.kicking).toBeGreaterThanOrEqual(4);
      expect(player.stamina).toBeGreaterThanOrEqual(4);
      expect(player.leadership).toBeGreaterThanOrEqual(4);
      expect(player.agility).toBeGreaterThanOrEqual(4);
    });

    it('should apply racial modifiers correctly for sylvan players', () => {
      const player = generateRandomPlayer('Sylvan Player', 'sylvan', 'team123');
      
      // Sylvan players get +3 speed, +4 agility, -2 power
      // With base 3 minimum: speed 6+, agility 7+, power 1+
      expect(player.speed).toBeGreaterThanOrEqual(6);
      expect(player.agility).toBeGreaterThanOrEqual(7);
      expect(player.power).toBeGreaterThanOrEqual(1);
    });

    it('should cap all stats at 40', () => {
      // Generate multiple players to test stat cap
      for (let i = 0; i < 10; i++) {
        const player = generateRandomPlayer(`Player ${i}`, 'gryll', 'team123');
        
        expect(player.speed).toBeLessThanOrEqual(40);
        expect(player.power).toBeLessThanOrEqual(40);
        expect(player.throwing).toBeLessThanOrEqual(40);
        expect(player.catching).toBeLessThanOrEqual(40);
        expect(player.kicking).toBeLessThanOrEqual(40);
        expect(player.stamina).toBeLessThanOrEqual(40);
        expect(player.leadership).toBeLessThanOrEqual(40);
        expect(player.agility).toBeLessThanOrEqual(40);
      }
    });

    it('should generate valid potential values', () => {
      const player = generateRandomPlayer('Test Player', 'human', 'team123');
      
      expect(parseFloat(player.speedPotential)).toBeGreaterThanOrEqual(15);
      expect(parseFloat(player.speedPotential)).toBeLessThanOrEqual(40);
      expect(parseFloat(player.overallPotentialStars)).toBeGreaterThanOrEqual(0.5);
      expect(parseFloat(player.overallPotentialStars)).toBeLessThanOrEqual(5.0);
    });

    it('should calculate salary based on stats', () => {
      const player = generateRandomPlayer('Test Player', 'human', 'team123');
      
      expect(player.salary).toBeGreaterThan(0);
      expect(player.contractValue).toBe(player.salary * 3);
    });

    it('should set initial values correctly', () => {
      const player = generateRandomPlayer('Test Player', 'human', 'team123');
      
      expect(player.camaraderie).toBe(50);
      expect(player.yearsOnTeam).toBe(0);
      expect(player.position).toBe('runner'); // Default position
    });

    it('should handle specified positions', () => {
      const passerPlayer = generateRandomPlayer('Passer', 'human', 'team123', 'passer');
      const blockerPlayer = generateRandomPlayer('Blocker', 'human', 'team123', 'blocker');
      
      expect(passerPlayer.position).toBe('passer');
      expect(blockerPlayer.position).toBe('blocker');
    });
  });

  describe('calculatePlayerValue', () => {
    it('should calculate value based on stats and potential', () => {
      const testPlayer = {
        speed: 20,
        power: 20,
        throwing: 20,
        catching: 20,
        kicking: 20,
        stamina: 20,
        leadership: 20,
        agility: 20,
        speedPotential: "25",
        powerPotential: "25",
        throwingPotential: "25",
        catchingPotential: "25",
        kickingPotential: "25",
        staminaPotential: "25",
        leadershipPotential: "25",
        agilityPotential: "25",
        age: 25
      };

      const value = calculatePlayerValue(testPlayer);
      
      // Base value should be 20 * 1000 + 25 * 500 = 32,500
      // Age factor for 25-year-old in prime = 1.2
      // Expected: 32,500 * 1.2 = 39,000
      expect(value).toBe(39000);
    });

    it('should apply age modifiers correctly', () => {
      const youngPlayer = {
        speed: 20, power: 20, throwing: 20, catching: 20,
        kicking: 20, stamina: 20, leadership: 20, agility: 20,
        speedPotential: "25", powerPotential: "25", throwingPotential: "25",
        catchingPotential: "25", kickingPotential: "25", staminaPotential: "25",
        leadershipPotential: "25", agilityPotential: "25",
        age: 20 // Young player
      };

      const oldPlayer = { ...youngPlayer, age: 35 }; // Old player

      const youngValue = calculatePlayerValue(youngPlayer);
      const oldValue = calculatePlayerValue(oldPlayer);

      // Young player should have higher value due to age factor
      expect(youngValue).toBeGreaterThan(oldValue);
    });

    it('should handle missing potential values with defaults', () => {
      const playerWithMissingPotentials = {
        speed: 20, power: 20, throwing: 20, catching: 20,
        kicking: 20, stamina: 20, leadership: 20, agility: 20,
        age: 25
      };

      const value = calculatePlayerValue(playerWithMissingPotentials);
      
      // Should use default potential of 25 for missing values
      expect(value).toBeGreaterThan(0);
    });
  });

  describe('processEndOfSeasonSkillProgression', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle player not found', async () => {
      const { storage } = await import('../storage/index');
      (storage.getPlayerById as any).mockResolvedValue(null);

      await expect(processEndOfSeasonSkillProgression('invalid-id'))
        .rejects.toThrow('Player with ID invalid-id not found');
    });

    it('should process skill progression for valid player', async () => {
      const mockPlayer = {
        id: 'player123',
        name: 'Test Player',
        age: 22,
        overallPotentialStars: '3.5',
        gamesPlayedLastSeason: 10,
        speed: 15,
        power: 15,
        throwing: 15,
        catching: 15,
        kicking: 15,
        stamina: 15,
        leadership: 15,
        agility: 15,
        speedPotential: '25',
        powerPotential: '25',
        throwingPotential: '25',
        catchingPotential: '25',
        kickingPotential: '25',
        staminaPotential: '25',
        leadershipPotential: '25',
        agilityPotential: '25'
      };

      const { storage } = await import('../storage/index');
      (storage.getPlayerById as any).mockResolvedValue(mockPlayer);
      (storage.updatePlayer as any).mockResolvedValue(undefined);

      await processEndOfSeasonSkillProgression('player123');

      // Should update games played to 0
      expect(storage.updatePlayer).toHaveBeenCalledWith('player123', {
        gamesPlayedLastSeason: 0
      });
    });

    it('should calculate progression chance correctly for young active player', async () => {
      const mockPlayer = {
        id: 'player123',
        name: 'Young Active Player',
        age: 20, // Young bonus
        overallPotentialStars: '4.0', // High potential bonus
        gamesPlayedLastSeason: 12, // Activity bonus
        speed: 15,
        speedPotential: '30' // Room for improvement
      };

      const { storage } = await import('../storage/index');
      (storage.getPlayerById as any).mockResolvedValue(mockPlayer);
      (storage.updatePlayer as any).mockResolvedValue(undefined);

      await processEndOfSeasonSkillProgression('player123');

      // Should be called at least once for resetting games played
      expect(storage.updatePlayer).toHaveBeenCalled();
    });

    it('should not improve stats that are at or above potential', async () => {
      const mockPlayer = {
        id: 'player123',
        name: 'Maxed Player',
        age: 22,
        overallPotentialStars: '3.0',
        gamesPlayedLastSeason: 10,
        speed: 30, // At potential
        speedPotential: '30',
        power: 35, // Above potential
        powerPotential: '30'
      };

      const { storage } = await import('../storage/index');
      (storage.getPlayerById as any).mockResolvedValue(mockPlayer);
      (storage.updatePlayer as any).mockResolvedValue(undefined);

      // Mock Math.random to always trigger progression
      vi.spyOn(Math, 'random').mockReturnValue(0.01);

      await processEndOfSeasonSkillProgression('player123');

      // Should only reset games played, no stat improvements
      expect(storage.updatePlayer).toHaveBeenCalledTimes(1);
      expect(storage.updatePlayer).toHaveBeenCalledWith('player123', {
        gamesPlayedLastSeason: 0
      });

      vi.restoreAllMocks();
    });
  });
});