/**
 * Stadium utility functions
 */

import type { Stadium } from '@shared/types/models';


/**
 * Calculate stadium pricing based on facility levels
 * Based on the official formulas in REALM_RIVALRY_COMPLETE_DOCUMENTATION.md
 */
export interface StadiumPricing {
  ticketPrice: string;
  concessionPrice: string;
  parkingPrice: string;
  vipSuitePrice: string;
}

/**
 * Get calculated stadium prices
 */
export function getStadiumPricing(stadium: Partial<Stadium>): StadiumPricing {
  const baseTicketPrice = 15; // Base ticket price in credits
  
  return {
    ticketPrice: baseTicketPrice.toString(),
    concessionPrice: (5 + (stadium.concessionsLevel || 1) * 2).toString(),
    parkingPrice: (8).toString(), // Base parking price
    vipSuitePrice: (100 + (stadium.vipSuitesLevel || 1) * 50).toString()
  };
}

/**
 * Add pricing to a stadium object
 */
export function withStadiumPricing<T extends Partial<Stadium>>(stadium: T): T & StadiumPricing {
  return {
    ...stadium,
    ...getStadiumPricing(stadium)
  };
}

/**
 * Calculate stadium revenue for a game
 * Based on the official formula in REALM_RIVALRY_COMPLETE_DOCUMENTATION.md
 */
export interface StadiumRevenue {
  tickets: number;
  concessions: number;
  parking: number;
  vipSuites: number;
  merchandise: number;
  total: number;
}

export function calculateGameRevenue(
  stadium: Partial<Stadium>,
  attendance: number,
  fanLoyalty: number
): StadiumRevenue {
  const baseTicketPrice = 15;
  const loyaltyMultiplier = fanLoyalty / 100;
  
  const tickets = Math.floor(attendance * baseTicketPrice * loyaltyMultiplier);
  const concessions = Math.floor(attendance * 12 * ((stadium.concessionsLevel || 1) * 0.1 + 0.8) * loyaltyMultiplier);
  const parking = Math.floor(Math.floor(attendance * 0.7) * 8 * ((stadium.parkingLevel || 1) * 0.05 + 0.9));
  const vipSuites = Math.floor((stadium.capacity || 5000) * 0.02 * 250 * ((stadium.vipSuitesLevel || 1) * 0.2 + 0.8));
  const merchandise = Math.floor(attendance * 8 * ((stadium.merchandisingLevel || 1) * 0.15 + 0.7) * loyaltyMultiplier);
  
  return {
    tickets,
    concessions,
    parking,
    vipSuites,
    merchandise,
    total: tickets + concessions + parking + vipSuites + merchandise
  };
}