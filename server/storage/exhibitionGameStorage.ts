import { prisma } from '../db';
import { PrismaClient, Game } from '../../generated/prisma/index.js';



export class ExhibitionGameStorage {
  async createExhibitionGame(gameData: {
    homeTeamId: number;
    awayTeamId: number;
    gameDate?: Date;
  }): Promise<Game> {
    const newGame = await prisma.game.create({
      data: {
        homeTeamId: gameData.homeTeamId,
        awayTeamId: gameData.awayTeamId,
        gameDate: gameData.gameDate || new Date(),
        status: 'SCHEDULED',
        matchType: 'EXHIBITION',
      },
      include: {
        league: true,
        tournament: true
      }
    });
    return newGame;
  }

  async getExhibitionGameById(id: number): Promise<Game | null> {
    const game = await prisma.game.findUnique({
      where: { 
        id,
        matchType: 'EXHIBITION'
      },
      include: {
        league: true,
        tournament: true
      }
    });
    return game;
  }

  async getExhibitionGamesByTeam(teamId: number, limit: number = 10): Promise<Game[]> {
    return await prisma.game.findMany({
      where: {
        matchType: 'EXHIBITION',
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ]
      },
      include: {
        league: true,
        tournament: true
      },
      orderBy: { gameDate: 'desc' },
      take: limit
    });
  }

  async getExhibitionGamesPlayedTodayByTeam(teamId: number): Promise<Game[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return await prisma.game.findMany({
      where: {
        matchType: 'EXHIBITION',
        OR: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ],
        gameDate: {
          gte: todayStart,
          lte: todayEnd
        }
      },
      include: {
        league: true,
        tournament: true
      },
      orderBy: { gameDate: 'desc' }
    });
  }

  async deleteExhibitionGame(id: number): Promise<boolean> {
    try {
      await prisma.game.delete({
        where: { 
          id,
          matchType: 'EXHIBITION'
        }
      });
      return true;
    } catch (error) {
      console.warn(`Exhibition game with ID ${id} not found for deletion.`);
      return false;
    }
  }
}

export const exhibitionGameStorage = new ExhibitionGameStorage();