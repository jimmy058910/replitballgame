import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();

async function checkDatabaseStatus() {
  try {
    console.log('=== DATABASE STATUS ===');
    
    const teams = await prisma.team.findMany({ include: { user: true } });
    console.log('Teams:', teams.length);
    teams.forEach(t => console.log('  -', t.name, 'Division', t.division, t.subdivision || 'no-sub'));

    const leagues = await prisma.league.findMany();
    console.log('Leagues:', leagues.length);
    leagues.forEach(l => console.log('  -', l.name, 'Division', l.division));

    const games = await prisma.game.findMany();
    console.log('Games:', games.length);

    const players = await prisma.player.findMany();
    console.log('Players:', players.length);

    const userProfiles = await prisma.userProfile.findMany();
    console.log('UserProfiles:', userProfiles.length);
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStatus();