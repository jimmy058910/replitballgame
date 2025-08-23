/**
 * UNIVERSAL CREDIT FORMATTING UTILITY
 * 
 * STANDARD FORMAT: amount₡ (amount BEFORE symbol)
 * CORRECT: "25,000₡", "1.5M₡", "0₡"
 * INCORRECT: "₡25,000", "₡1.5M", "₡0"
 * 
 * This utility ensures consistent credit display across the entire application.
 * Always use this function when displaying credits to maintain formatting standards.
 */

export const formatCredits = (value: string | number): string => {
  const num = typeof value === 'string' ? parseInt(value) || 0 : value;
  
  // Format large numbers with M/K suffixes
  if (Math.abs(num) >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M₡`;
  }
  if (Math.abs(num) >= 1000) {
    return `${(num / 1000).toFixed(1)}K₡`;
  }
  
  // Format with commas for readability
  return `${num.toLocaleString()}₡`;
};

export const formatCreditsSimple = (value: string | number): string => {
  const num = typeof value === 'string' ? parseInt(value) || 0 : value;
  return `${num.toLocaleString()}₡`;
};

export const formatCreditsCompact = (value: string | number): string => {
  const num = typeof value === 'string' ? parseInt(value) || 0 : value;
  
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M₡`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K₡`;
  return `${num}₡`;
};