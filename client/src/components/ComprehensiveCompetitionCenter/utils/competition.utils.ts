/**
 * Shared utility functions for Competition Center components
 * Extracted from ComprehensiveCompetitionCenter.tsx
 */

import type { DailyTournamentRewards, MidSeasonCupRewards, EntryFees } from '../types/competition.types';

/**
 * Helper function to map backend tournament status to frontend status
 */
export const mapTournamentStatus = (backendStatus: string): 'UPCOMING' | 'ACTIVE' | 'COMPLETED' => {
  switch (backendStatus) {
    case 'REGISTRATION_OPEN':
      return 'UPCOMING';
    case 'IN_PROGRESS':
      return 'ACTIVE';
    case 'COMPLETED':
      return 'COMPLETED';
    default:
      return 'UPCOMING';
  }
};

/**
 * Helper function to format match time in EDT
 */
export const formatMatchTime = (gameDate: string) => {
  const date = new Date(gameDate);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York' // EDT timezone
  });
};

/**
 * Helper function to get division name using Greek alphabet naming
 */
export const getDivisionName = (division: number): string => {
  const divisionNames = ["", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Copper", "Iron", "Stone"];
  return divisionNames[division] || "Stone";
};

/**
 * Helper function to get Daily Division Tournament rewards
 */
export const getDailyTournamentRewards = (division: number): DailyTournamentRewards => {
  const rewardTable: Record<number, DailyTournamentRewards> = {
    2: { champion: 16000, runnerUp: 6000, championGems: 8 },
    3: { champion: 12000, runnerUp: 4500, championGems: 5 },
    4: { champion: 9000, runnerUp: 3000, championGems: 3 },
    5: { champion: 6000, runnerUp: 2000 },
    6: { champion: 4000, runnerUp: 1500 },
    7: { champion: 2500, runnerUp: 1000 },
    8: { champion: 1500, runnerUp: 500 }
  };
  return rewardTable[division] || rewardTable[8];
};

/**
 * Helper function to get Mid-Season Cup rewards
 */
export const getMidSeasonCupRewards = (division: number): MidSeasonCupRewards => {
  const rewardTable: Record<number, MidSeasonCupRewards> = {
    1: { champion: 200000, runnerUp: 80000, championGems: 75, semifinalist: 30000 },
    2: { champion: 150000, runnerUp: 60000, championGems: 60, semifinalist: 25000 },
    3: { champion: 100000, runnerUp: 40000, championGems: 40, semifinalist: 15000 },
    4: { champion: 75000, runnerUp: 30000, championGems: 30, semifinalist: 10000 },
    5: { champion: 50000, runnerUp: 20000, championGems: 20, semifinalist: 7500 },
    6: { champion: 30000, runnerUp: 12000, championGems: 15, semifinalist: 5000 },
    7: { champion: 20000, runnerUp: 8000, championGems: 10, semifinalist: 2500 },
    8: { champion: 15000, runnerUp: 6000, championGems: 5, semifinalist: 2000 }
  };
  return rewardTable[division] || rewardTable[8];
};

/**
 * Helper function to get Mid-Season Cup entry fees
 */
export const getMidSeasonCupEntryFees = (division: number): EntryFees => {
  // Divisions 1-4 (Diamond, Platinum, Gold, Silver): 7500₡ OR 20💎
  // Divisions 5-8 (Bronze, Copper, Iron, Stone): 1500₡ OR 10💎
  if (division >= 1 && division <= 4) {
    return { credits: 7500, gems: 20 };
  } else {
    return { credits: 1500, gems: 10 };
  }
};

/**
 * Calculate dynamic countdown based on registration end time
 */
export const calculateTimeRemaining = (registrationEndTime: string | null, currentTime: Date = new Date()): number => {
  if (!registrationEndTime) return 0;
  const endTime = new Date(registrationEndTime).getTime();
  const now = currentTime.getTime();
  return Math.max(0, endTime - now);
};

/**
 * Format countdown timer for daily tournament auto-fill
 */
export const formatTournamentCountdown = (registrationEndTime: string | null, currentTime: Date = new Date()) => {
  const timeRemaining = calculateTimeRemaining(registrationEndTime, currentTime);
  
  if (timeRemaining <= 0) {
    return "Starting soon...";
  }
  
  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
};

/**
 * Determine promotion/relegation status based on position
 */
export const getPositionStatus = (position: number, totalTeams: number = 8) => {
  if (position <= 2) return 'promotion';
  if (position >= totalTeams - 1) return 'relegation';
  return 'neutral';
};

/**
 * Format credit amounts with proper symbol placement (amount before ₡)
 */
export const formatCredits = (amount: number): string => {
  return `${amount.toLocaleString()}₡`;
};

/**
 * Format gem amounts with proper symbol
 */
export const formatGems = (amount: number): string => {
  return `${amount}💎`;
};