#!/usr/bin/env node

/**
 * CRITICAL FIX: Update Oakland Cougars match opponent from Shadow Runners 197 to Iron Wolves 686
 * Issue: Database shows wrong opponent for today's match at 4:30 PM
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixMatchOpponent() {
  try {
    console.log('🔍 Finding teams and today\'s match...');
    
    // Find Oakland Cougars team
    const oaklandCougars = await prisma.team.findFirst({
      where: { name: 'Oakland Cougars' }
    });
    
    if (!oaklandCougars) {
      console.log('❌ Oakland Cougars team not found');
      return;
    }
    
    console.log('✅ Found Oakland Cougars:', oaklandCougars.id, oaklandCougars.name);
    
    // Find Shadow Runners 197 team
    const shadowRunners = await prisma.team.findFirst({
      where: { name: 'Shadow Runners 197' }
    });
    
    // Find Iron Wolves 686 team
    const ironWolves = await prisma.team.findFirst({
      where: { name: 'Iron Wolves 686' }
    });
    
    console.log('🔍 Shadow Runners 197 ID:', shadowRunners?.id);
    console.log('🔍 Iron Wolves 686 ID:', ironWolves?.id);
    
    // Find today's match for Oakland Cougars
    const today = new Date('2025-08-21');
    const tomorrow = new Date('2025-08-22');
    
    const todaysMatch = await prisma.game.findFirst({
      where: {
        OR: [
          { homeTeamId: oaklandCougars.id },
          { awayTeamId: oaklandCougars.id }
        ],
        gameDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        homeTeam: true,
        awayTeam: true
      }
    });
    
    if (!todaysMatch) {
      console.log('❌ No match found for Oakland Cougars today');
      return;
    }
    
    console.log('🎯 Found today\'s match:', {
      id: todaysMatch.id,
      homeTeam: todaysMatch.homeTeam.name,
      awayTeam: todaysMatch.awayTeam.name,
      gameDate: todaysMatch.gameDate
    });
    
    // Check if opponent is Shadow Runners 197 and update to Iron Wolves 686
    if (ironWolves && shadowRunners) {
      let updateData = {};
      
      if (todaysMatch.homeTeamId === oaklandCougars.id && todaysMatch.awayTeamId === shadowRunners.id) {
        // Oakland home vs Shadow Runners - change away team to Iron Wolves
        updateData.awayTeamId = ironWolves.id;
        console.log('🔧 Updating away team from Shadow Runners 197 to Iron Wolves 686');
      } else if (todaysMatch.awayTeamId === oaklandCougars.id && todaysMatch.homeTeamId === shadowRunners.id) {
        // Shadow Runners home vs Oakland away - change home team to Iron Wolves
        updateData.homeTeamId = ironWolves.id;
        console.log('🔧 Updating home team from Shadow Runners 197 to Iron Wolves 686');
      } else {
        console.log('ℹ️  Match does not involve Shadow Runners 197, no update needed');
        return;
      }
      
      // Perform the update
      const updatedMatch = await prisma.game.update({
        where: { id: todaysMatch.id },
        data: updateData,
        include: {
          homeTeam: true,
          awayTeam: true
        }
      });
      
      console.log('✅ Match updated successfully:', {
        id: updatedMatch.id,
        homeTeam: updatedMatch.homeTeam.name,
        awayTeam: updatedMatch.awayTeam.name,
        gameDate: updatedMatch.gameDate
      });
    } else {
      console.log('❌ Could not find Iron Wolves 686 or Shadow Runners 197 teams');
    }
    
  } catch (error) {
    console.error('❌ Error fixing match opponent:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMatchOpponent();