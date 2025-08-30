
import('./server/services/lateSignupService.js').then(async ({ LateSignupService }) => {
  const { getPrismaClient } = await import('./server/database.js');
  const prisma = await getPrismaClient();
  
  console.log('🧹 Clearing alpha subdivision games...');
  const alphaTeams = await prisma.team.findMany({
    where: { division: 8, subdivision: 'alpha' }
  });
  
  console.log('Found alpha teams:', alphaTeams.map(t => t.name));
  const alphaTeamIds = alphaTeams.map(t => t.id);
  
  const deleted = await prisma.game.deleteMany({
    where: {
      matchType: 'LEAGUE',
      OR: [
        { homeTeamId: { in: alphaTeamIds } },
        { awayTeamId: { in: alphaTeamIds } }
      ]
    }
  });
  
  console.log('🗑️  Deleted', deleted.count, 'existing games');
  
  console.log('⚡ Generating fresh schedule with corrected Day 14 patterns...');
  await LateSignupService.generateShortenedSeasonSchedule('alpha', alphaTeams);
  
  console.log('✅ Schedule regeneration complete');
  
  const newGames = await prisma.game.findMany({
    where: {
      matchType: 'LEAGUE',
      OR: [
        { homeTeamId: { in: alphaTeamIds } },
        { awayTeamId: { in: alphaTeamIds } }
      ]
    },
    orderBy: { gameDate: 'asc' }
  });
  
  console.log('📊 Total games created:', newGames.length);
  
  const gamesByDay = {};
  newGames.forEach(game => {
    const dayNum = Math.floor((new Date(game.gameDate) - new Date('2025-08-16')) / (1000*60*60*24)) + 1;
    if (!gamesByDay[dayNum]) gamesByDay[dayNum] = 0;
    gamesByDay[dayNum]++;
  });
  
  console.log('📅 Games per day:', gamesByDay);
}).catch(console.error);
