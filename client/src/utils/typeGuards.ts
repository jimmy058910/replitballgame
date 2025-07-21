// Type guard utilities to safely check API responses
import { StoreItem, Team, TeamFinances } from '@shared/types/api';

export function isStoreItem(item: any): item is StoreItem {
  return item && typeof item.id === 'string' && typeof item.name === 'string';
}

export function isTeam(team: any): team is Team {
  return team && typeof team.id === 'string' && typeof team.name === 'string';
}

export function isTeamFinances(finances: any): finances is TeamFinances {
  return finances && typeof finances.credits === 'number';
}

export function isStoreItemArray(items: any): items is StoreItem[] {
  return Array.isArray(items) && items.every(isStoreItem);
}

export function isTeamArray(teams: any): teams is Team[] {
  return Array.isArray(teams) && teams.every(isTeam);
}

// Safe property access with fallbacks
export function safeStringAccess(obj: any, prop: string, fallback = ''): string {
  return obj?.[prop] && typeof obj[prop] === 'string' ? obj[prop] : fallback;
}

export function safeNumberAccess(obj: any, prop: string, fallback = 0): number {
  return obj?.[prop] && typeof obj[prop] === 'number' ? obj[prop] : fallback;
}

export function safeArrayAccess<T>(obj: any, prop: string, fallback: T[] = []): T[] {
  return obj?.[prop] && Array.isArray(obj[prop]) ? obj[prop] : fallback;
}