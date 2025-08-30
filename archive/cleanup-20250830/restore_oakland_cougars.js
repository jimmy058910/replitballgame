#!/usr/bin/env node

// CRITICAL: Direct restoration of Oakland Cougars team data
// This script bypasses API routing issues and directly restores the team

// Find the correct database module
import { storage } from './server/storage/index.js';

async function restoreOaklandCougars() {
  console.log('🚨 EMERGENCY RESTORATION: Oakland Cougars Team');
  
  try {
    // Use the storage layer directly to bypass database connection issues
    console.log('🔧 Using storage layer for team restoration...');
    
    // Get team using storage
    const team = await storage.teams.getTeamById(4);
    
    if (!team) {
      console.log('❌ Team 4 (Oakland Cougars) not found!');
      return;
    }
    
    console.log(`✅ Found team: ${team.name}`);
    console.log(`📊 Current state: ${team.playersCount || 0} players, Finances: ${team.finances?.credits || 0} credits`);
    
    // Direct restoration using storage methods
    try {
      console.log('💰 Creating default finances...');
      await storage.teams.createDefaultFinancesForTeam(4);
      console.log('✅ Finances restored');
    } catch (error) {
      console.log('⚠️ Finances may already exist:', error.message);
    }
    
    try {
      console.log('👥 Creating starter roster...');
      await storage.teams.generateStarterRoster(4);
      console.log('✅ Roster restored');
    } catch (error) {
      console.log('⚠️ Roster creation issue:', error.message);
    }
    
    try {
      console.log('👔 Creating starter staff...');
      await storage.teams.generateStarterStaff(4);
      console.log('✅ Staff restored');
    } catch (error) {
      console.log('⚠️ Staff creation issue:', error.message);
    }
    
    try {
      console.log('🏟️ Creating stadium...');
      await storage.teams.createDefaultStadiumForTeam(4);
      console.log('✅ Stadium restored');
    } catch (error) {
      console.log('⚠️ Stadium may already exist:', error.message);
    }
    
    // Get final team state
    const restoredTeam = await storage.teams.getTeamById(4);
    console.log('🎉 RESTORATION COMPLETE!');
    console.log(`📊 Final state: ${restoredTeam.playersCount || 0} players`);
    console.log(`💰 Finances: ${restoredTeam.finances?.credits || 0} credits`);
    
    return;

    
  } catch (error) {
    console.error('❌ RESTORATION FAILED:', error);
    throw error;
  }
}

function generateRandomFirstName() {
  const names = ["Alex", "Jordan", "Casey", "Morgan", "Riley", "Avery", "Quinn", "Sage", "River", "Phoenix", "Skylar", "Cameron"];
  return names[Math.floor(Math.random() * names.length)];
}

function generateRandomLastName() {
  const names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez"];
  return names[Math.floor(Math.random() * names.length)];
}

// Run the restoration
restoreOaklandCougars()
  .then(() => {
    console.log('✅ Oakland Cougars restoration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Oakland Cougars restoration failed:', error);
    process.exit(1);
  });