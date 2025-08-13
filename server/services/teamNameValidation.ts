import { profanity } from '@2toad/profanity';
import { getPrismaClient } from '../database.js';

// Configure the profanity filter
profanity.addWords([
  // Additional gaming-specific inappropriate terms
  'noob', 'scrub', 'trash', 'garbage', 'sucks', 'loser', 'troll', 'toxic',
  // Spam/nonsense patterns
  'aaa', 'bbb', 'ccc', 'ddd', 'eee', 'fff', 'ggg', 'hhh', 'iii',
  'jjj', 'kkk', 'lll', 'mmm', 'nnn', 'ooo', 'ppp', 'qqq', 'rrr',
  'sss', 'ttt', 'uuu', 'vvv', 'www', 'xxx', 'yyy', 'zzz',
  '111', '222', '333', '444', '555', '666', '777', '888', '999',
  'test', 'testing', 'temp', 'temporary', 'delete', 'remove'
]);

// Reserved names - staff roles and system terms
const RESERVED_NAMES = [
  // Staff roles
  'admin', 'administrator', 'mod', 'moderator', 'system', 'dev', 'developer',
  'gm', 'gamemaster', 'staff', 'owner', 'root', 'superuser', 'support',
  'help', 'bot', 'official', 'team', 'league', 'tournament', 'game',
  // Real world teams (major sports)
  'lakers', 'warriors', 'celtics', 'yankees', 'dodgers', 'patriots',
  'cowboys', 'packers', 'steelers', 'chiefs', 'rams', 'eagles',
  'manchester', 'liverpool', 'arsenal', 'chelsea', 'barcelona', 'madrid',
  // Famous people/brands
  'nike', 'adidas', 'jordan', 'lebron', 'brady', 'mahomes', 'messi',
  'ronaldo', 'trump', 'biden', 'obama', 'elon', 'bezos', 'gates',
  // Generic terms that could confuse
  'null', 'undefined', 'error', 'exception', 'debug', 'console',
  'anonymous', 'guest', 'user', 'player', 'newbie', 'rookie'
];

// PII patterns
const PII_PATTERNS = [
  // Email pattern
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  // Phone patterns (US format)
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
  /\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/,
  // Credit card patterns (basic)
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,
  // SSN pattern
  /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/,
  // Full name with middle initial pattern
  /\b[A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+\b/,
  // Address-like patterns
  /\b\d+\s+[A-Za-z\s]+\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/i
];

export interface TeamNameValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedName?: string;
}

export class TeamNameValidator {
  /**
   * Validates a team name against all rules
   */
  static async validateTeamName(name: string, excludeTeamId?: string): Promise<TeamNameValidationResult> {
    try {
      console.log('🔍 Starting team name validation for:', name);
      
      // Step 1: Basic sanitization
      console.log('🔍 Step 1: Sanitizing name...');
      const sanitized = this.sanitizeName(name);
      console.log('🔍 Sanitized result:', sanitized);
      
      // Step 2: Length validation
      console.log('🔍 Step 2: Length validation...');
      const lengthResult = this.validateLength(sanitized);
      console.log('🔍 Length validation result:', lengthResult);
      if (!lengthResult.isValid) return lengthResult;
      
      // Step 3: Character validation
      console.log('🔍 Step 3: Character validation...');
      const charResult = this.validateCharacters(sanitized);
      console.log('🔍 Character validation result:', charResult);
      if (!charResult.isValid) return charResult;
      
      // Step 4: Profanity filter (enabled for testing)
      console.log('🔍 Step 4: Profanity validation...');
      const profanityResult = this.validateProfanity(sanitized);
      console.log('🔍 Profanity validation result:', profanityResult);
      if (!profanityResult.isValid) return profanityResult;
      
      // Step 5: Reserved names check (disabled for development)
      if (process.env.NODE_ENV !== 'development') {
        console.log('🔍 Step 5: Reserved names validation...');
        const reservedResult = this.validateReservedNames(sanitized);
        console.log('🔍 Reserved names validation result:', reservedResult);
        if (!reservedResult.isValid) return reservedResult;
      }
      
      // Step 6: PII filter
      console.log('🔍 Step 6: PII validation...');
      const piiResult = this.validatePII(sanitized);
      console.log('🔍 PII validation result:', piiResult);
      if (!piiResult.isValid) return piiResult;
      
      // Step 7: Uniqueness check (temporarily disabled for development debugging)
      if (process.env.NODE_ENV !== 'development') {
        console.log('🔍 Step 7: Uniqueness validation...');
        const uniqueResult = await this.validateUniqueness(sanitized, excludeTeamId);
        console.log('🔍 Uniqueness validation result:', uniqueResult);
        if (!uniqueResult.isValid) return uniqueResult;
      }
      
      console.log('✅ All validation steps passed!');
      return {
        isValid: true,
        sanitizedName: sanitized
      };
      
    } catch (error) {
      console.error('🚨 TEAM NAME VALIDATION ERROR:', error);
      console.error('🚨 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('🚨 Error message:', error instanceof Error ? error.message : String(error));
      return {
        isValid: false,
        error: 'Validation failed. Please try again.'
      };
    }
  }
  
  /**
   * Sanitizes the input name by trimming and collapsing spaces
   */
  private static sanitizeName(name: string): string {
    return name
      .trim() // Remove leading/trailing spaces
      .replace(/\s+/g, ' '); // Collapse multiple spaces into single space
  }
  
  /**
   * Validates name length (3-20 characters)
   */
  private static validateLength(name: string): TeamNameValidationResult {
    if (name.length < 3) {
      return {
        isValid: false,
        error: 'Team name must be at least 3 characters long.'
      };
    }
    
    if (name.length > 20) {
      return {
        isValid: false,
        error: 'Team name must be 20 characters or less.'
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Validates allowed characters (alphanumeric + single spaces)
   */
  private static validateCharacters(name: string): TeamNameValidationResult {
    // Check for valid characters only: letters, numbers, and single spaces
    const validPattern = /^[a-zA-Z0-9 ]+$/;
    
    if (!validPattern.test(name)) {
      return {
        isValid: false,
        error: 'Team name may only contain letters, numbers, and spaces.'
      };
    }
    
    // Check for leading or trailing spaces (should be caught by sanitization)
    if (name.startsWith(' ') || name.endsWith(' ')) {
      return {
        isValid: false,
        error: 'Team name cannot start or end with spaces.'
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Validates against profanity using @2toad/profanity library
   */
  private static validateProfanity(name: string): TeamNameValidationResult {
    // Check the full name
    if (profanity.exists(name)) {
      return {
        isValid: false,
        error: 'Team name contains inappropriate language.'
      };
    }
    
    // Check individual words separated by spaces
    const words = name.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (profanity.exists(word)) {
        return {
          isValid: false,
          error: 'Team name contains inappropriate language.'
        };
      }
    }
    
    // Check for profane words embedded within compound words
    // This uses a more comprehensive approach to catch profanity within compound names
    const lowerName = name.toLowerCase();
    
    // Common profane words that might be embedded in team names
    const embeddedProfanityCheck = [
      'damn', 'fuck', 'shit', 'bitch', 'ass', 'hell', 'crap', 'bastard',
      'piss', 'cock', 'dick', 'pussy', 'tits', 'boobs', 'porn', 'sex',
      'nazi', 'hitler', 'kill', 'die', 'murder', 'suicide', 'bomb',
      'weed', 'drug', 'meth', 'cocaine', 'heroin'
    ];
    
    for (const word of embeddedProfanityCheck) {
      if (lowerName.includes(word)) {
        return {
          isValid: false,
          error: 'Team name contains inappropriate language.'
        };
      }
    }
    
    return { isValid: true };
  }
  
  /**
   * Validates against reserved names
   */
  private static validateReservedNames(name: string): TeamNameValidationResult {
    const lowerName = name.toLowerCase();
    
    for (const reserved of RESERVED_NAMES) {
      if (lowerName === reserved.toLowerCase() || lowerName.includes(reserved.toLowerCase())) {
        return {
          isValid: false,
          error: 'This name is reserved and cannot be used.'
        };
      }
    }
    
    return { isValid: true };
  }
  
  /**
   * Validates against PII patterns
   */
  private static validatePII(name: string): TeamNameValidationResult {
    for (const pattern of PII_PATTERNS) {
      if (pattern.test(name)) {
        return {
          isValid: false,
          error: 'Team names cannot contain personal information like emails or phone numbers.'
        };
      }
    }
    
    return { isValid: true };
  }
  
  /**
   * Validates uniqueness in database (case-insensitive)
   */
  private static async validateUniqueness(name: string, excludeTeamId?: string): Promise<TeamNameValidationResult> {
    try {
      // Use Prisma to query the Team table
      const whereClause: any = {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      };
      
      if (excludeTeamId) {
        whereClause.id = {
          not: parseInt(excludeTeamId)
        };
      }
      
      const prisma = await getPrismaClient();
      
      const existingTeam = await prisma.team.findFirst({
        where: whereClause,
        select: { id: true, name: true }
      });
      
      console.log('🔍 Team uniqueness check:', {
        searchName: name,
        excludeTeamId,
        foundExisting: !!existingTeam,
        existingName: existingTeam?.name
      });
      
      if (existingTeam) {
        return {
          isValid: false,
          error: 'This team name is already taken. Please choose a different name.'
        };
      }
      
      return { isValid: true };
      
    } catch (error) {
      console.error('Database uniqueness check failed:', error);
      return {
        isValid: false,
        error: 'Unable to verify name availability. Please try again.'
      };
    }
  }
  
  /**
   * Gets user-friendly validation rules for UI display
   */
  static getValidationRules(): string[] {
    return [
      'Must be between 3 and 20 characters',
      'May contain letters (A-Z), numbers (0-9), and spaces',
      'No special characters or inappropriate language',
      'Must be unique and not already taken'
    ];
  }
  
  /**
   * Validates a name and returns suggestions if invalid
   */
  static async validateWithSuggestions(name: string, excludeTeamId?: string): Promise<{
    result: TeamNameValidationResult;
    suggestions?: string[];
  }> {
    const result = await this.validateTeamName(name, excludeTeamId);
    
    if (!result.isValid && result.error?.includes('already taken')) {
      // Generate some suggestions
      const suggestions = this.generateNameSuggestions(name);
      return { result, suggestions };
    }
    
    return { result };
  }
  
  /**
   * Generates alternative name suggestions
   */
  private static generateNameSuggestions(baseName: string): string[] {
    const sanitized = this.sanitizeName(baseName);
    const suggestions: string[] = [];
    
    // Add numbers
    for (let i = 1; i <= 5; i++) {
      suggestions.push(`${sanitized} ${i}`);
      if (sanitized.length <= 16) {
        suggestions.push(`${sanitized}${i}`);
      }
    }
    
    // Add common suffixes
    const suffixes = ['FC', 'United', 'City', 'Team', 'Club'];
    for (const suffix of suffixes) {
      if (sanitized.length + suffix.length + 1 <= 20) {
        suggestions.push(`${sanitized} ${suffix}`);
      }
    }
    
    // Add prefixes
    const prefixes = ['The', 'New', 'Pro', 'Elite'];
    for (const prefix of prefixes) {
      if (prefix.length + sanitized.length + 1 <= 20) {
        suggestions.push(`${prefix} ${sanitized}`);
      }
    }
    
    return suggestions.slice(0, 5); // Return top 5 suggestions
  }
}