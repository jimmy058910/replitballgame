#!/usr/bin/env node

// Simple script to clear all games using dotenv from the server setup
import { config } from 'dotenv';
import path from 'path';

// Load environment exactly like server does
const __dirname = path.dirname(new URL(import.meta.url).pathname);
config({ path: path.join(__dirname, '..', '.env.local') });

console.log('🧹 Starting database cleanup...');
console.log('DATABASE_URL preview:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'NOT_FOUND');

// Import database after env is loaded
const { getPrismaClient } = await import('../server/database.js');

async function clearAllGames() {
  try {
    const prisma = await getPrismaClient();
    
    // Delete all games regardless of type
    const deletedGames = await prisma.game.deleteMany({});
    console.log(`✅ Deleted ${deletedGames.count} games`);
    
    // Clear team statistics
    await prisma.team.updateMany({
      data: {
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0
      }
    });
    console.log(`✅ Reset team statistics`);
    
    // Update season to Day 1
    await prisma.season.updateMany({
      data: {
        currentDay: 1
      }
    });
    console.log(`✅ Reset season to Day 1`);
    
    console.log('🎉 Database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

clearAllGames().catch(console.error);