import { getPrismaClient } from "../database.js";
import { randomUUID } from "crypto";

interface TournamentMatch {
  id: string;
  round: string;
  homeTeam: {
    id: string;
    name: string;
    seed?: number;
  };
  awayTeam: {
    id: string;
    name: string;
    seed?: number;
  };
  homeScore?: number;
  awayScore?: number;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  startTime?: string;
  winner?: string;
}

export class TournamentMatchService {
  
  /**
   * Generate tournament matches for an 8-team single elimination tournament
   */
  static async generateTournamentMatches(tournamentId: string): Promise<TournamentMatch[]> {
    try {
      // Get tournament and participants
      const tournament = await prisma.tournament.findUnique({
        where: { id: parseInt(tournamentId) },
        include: {
          entries: {
            include: {
              team: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              registeredAt: 'asc' // First come, first served seeding
            }
          }
        }
      });

      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (tournament.entries.length !== 8) {
        throw new Error('Tournament must have exactly 8 teams');
      }

      // Seed teams based on registration order
      const seededTeams = tournament.entries.map((entry: any, index: number) => ({
        id: entry.teamId,
        name: entry.team?.name || 'Unknown Team',
        seed: index + 1
      }));

      // Generate quarterfinal matches (first round)
      const quarterfinalMatches = [
        {
          id: randomUUID(),
          round: 'QUARTERFINALS',
          homeTeam: seededTeams[0], // Seed 1
          awayTeam: seededTeams[7], // Seed 8
          status: 'SCHEDULED' as const,
          startTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
        },
        {
          id: randomUUID(),
          round: 'QUARTERFINALS',
          homeTeam: seededTeams[1], // Seed 2
          awayTeam: seededTeams[6], // Seed 7
          status: 'SCHEDULED' as const,
          startTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes from now
        },
        {
          id: randomUUID(),
          round: 'QUARTERFINALS',
          homeTeam: seededTeams[2], // Seed 3
          awayTeam: seededTeams[5], // Seed 6
          status: 'SCHEDULED' as const,
          startTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
        },
        {
          id: randomUUID(),
          round: 'QUARTERFINALS',
          homeTeam: seededTeams[3], // Seed 4
          awayTeam: seededTeams[4], // Seed 5
          status: 'SCHEDULED' as const,
          startTime: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 minutes from now
        }
      ];

      // Generate semifinal matches (placeholders for now)
      const semifinalMatches = [
        {
          id: randomUUID(),
          round: 'SEMIFINALS',
          homeTeam: { id: 'TBD', name: 'Winner QF1' },
          awayTeam: { id: 'TBD', name: 'Winner QF2' },
          status: 'SCHEDULED' as const,
          startTime: new Date(Date.now() + 40 * 60 * 1000).toISOString(), // 40 minutes from now
        },
        {
          id: randomUUID(),
          round: 'SEMIFINALS',
          homeTeam: { id: 'TBD', name: 'Winner QF3' },
          awayTeam: { id: 'TBD', name: 'Winner QF4' },
          status: 'SCHEDULED' as const,
          startTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45 minutes from now
        }
      ];

      // Generate finals match (placeholder for now)
      const finalMatch = {
        id: randomUUID(),
        round: 'FINALS',
        homeTeam: { id: 'TBD', name: 'Winner SF1' },
        awayTeam: { id: 'TBD', name: 'Winner SF2' },
        status: 'SCHEDULED' as const,
        startTime: new Date(Date.now() + 70 * 60 * 1000).toISOString(), // 70 minutes from now
      };

      const allMatches = [...quarterfinalMatches, ...semifinalMatches, finalMatch];

      // Store matches in database
      await this.storeTournamentMatches(parseInt(tournamentId), allMatches);

      return allMatches;
    } catch (error) {
      console.error('Error generating tournament matches:', error);
      throw error;
    }
  }

  /**
   * Store tournament matches in database
   */
  private static async storeTournamentMatches(tournamentId: number, matches: TournamentMatch[]) {
    try {
      const matchesToStore = matches.map((match: any) => ({
        id: match.id,
        tournamentId: tournamentId,
        round: match.round,
        homeTeamId: match.homeTeam.id !== 'TBD' ? match.homeTeam.id : null,
        awayTeamId: match.awayTeam.id !== 'TBD' ? match.awayTeam.id : null,
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name,
        homeScore: match.homeScore || null,
        awayScore: match.awayScore || null,
        status: match.status,
        startTime: match.startTime ? new Date(match.startTime) : null,
        winner: match.winner || null
      }));

      // Check if tournament_matches table exists, if not create it
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS tournament_matches (
          id VARCHAR(255) PRIMARY KEY,
          tournament_id INTEGER NOT NULL,
          round VARCHAR(50) NOT NULL,
          home_team_id VARCHAR(255),
          away_team_id VARCHAR(255),
          home_team_name VARCHAR(255) NOT NULL,
          away_team_name VARCHAR(255) NOT NULL,
          home_score INTEGER,
          away_score INTEGER,
          status VARCHAR(50) NOT NULL,
          start_time TIMESTAMP,
          winner VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;

      // Insert matches
      for (const match of matchesToStore) {
        await prisma.$executeRaw`
          INSERT IGNORE INTO tournament_matches (
            id, tournament_id, round, home_team_id, away_team_id, 
            home_team_name, away_team_name, home_score, away_score, 
            status, start_time, winner
          ) VALUES (
            ${match.id}, ${match.tournamentId}, ${match.round}, 
            ${match.homeTeamId}, ${match.awayTeamId}, 
            ${match.homeTeamName}, ${match.awayTeamName}, 
            ${match.homeScore}, ${match.awayScore}, 
            ${match.status}, ${match.startTime}, ${match.winner}
          )
        `;
      }
    } catch (error) {
      console.error('Error storing tournament matches:', error);
      throw error;
    }
  }

  /**
   * Get tournament matches
   */
  static async getTournamentMatches(tournamentId: string): Promise<TournamentMatch[]> {
    try {
      const matches = await prisma.$queryRaw<any[]>`
        SELECT * FROM tournament_matches 
        WHERE tournament_id = ${parseInt(tournamentId)}
        ORDER BY start_time ASC
      `;

      return matches.map((match: any) => ({
        id: match.id,
        round: match.round,
        homeTeam: {
          id: match.home_team_id || 'TBD',
          name: match.home_team_name,
          seed: this.getSeedFromName(match.home_team_name)
        },
        awayTeam: {
          id: match.away_team_id || 'TBD',
          name: match.away_team_name,
          seed: this.getSeedFromName(match.away_team_name)
        },
        homeScore: match.home_score,
        awayScore: match.away_score,
        status: match.status,
        startTime: match.start_time,
        winner: match.winner
      }));
    } catch (error) {
      console.error('Error getting tournament matches:', error);
      return [];
    }
  }

  /**
   * Simulate a tournament match (for testing purposes)
   */
  static async simulateTournamentMatch(matchId: string): Promise<{ homeScore: number; awayScore: number; winner: string }> {
    try {
      // Get match details
      const match = await prisma.$queryRaw<any[]>`
        SELECT * FROM tournament_matches WHERE id = ${matchId}
      `;

      if (!match.length) {
        throw new Error('Match not found');
      }

      const matchData = match[0];
      
      // Simple random simulation
      const homeScore = Math.floor(Math.random() * 5);
      const awayScore = Math.floor(Math.random() * 5);
      const winner = homeScore > awayScore ? matchData.home_team_name : matchData.away_team_name;

      // Update match with results
      await prisma.$executeRaw`
        UPDATE tournament_matches 
        SET home_score = ${homeScore}, away_score = ${awayScore}, 
            winner = ${winner}, status = 'COMPLETED'
        WHERE id = ${matchId}
      `;

      return { homeScore, awayScore, winner };
    } catch (error) {
      console.error('Error simulating tournament match:', error);
      throw error;
    }
  }

  /**
   * Start a tournament match (set status to LIVE)
   */
  static async startTournamentMatch(matchId: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE tournament_matches 
        SET status = 'LIVE'
        WHERE id = ${matchId}
      `;
    } catch (error) {
      console.error('Error starting tournament match:', error);
      throw error;
    }
  }

  /**
   * Get seed number from team name (helper function)
   */
  private static getSeedFromName(teamName: string): number | undefined {
    // For now, return undefined as we don't have seed info in team names
    // This could be enhanced to parse seed info from team names or store separately
    return undefined;
  }
}