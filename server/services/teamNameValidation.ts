import { db } from '../db';
import { teams } from '../../shared/schema';
import { sql, and, ne } from 'drizzle-orm';

// Profanity filter - comprehensive list of inappropriate terms
const PROFANITY_LIST = [
  // Basic profanity
  'fuck', 'shit', 'damn', 'hell', 'ass', 'bitch', 'bastard', 'crap',
  // Hate speech and slurs (partial list for safety)
  'nazi', 'hitler', 'terrorist', 'jihad', 'isis', 'kill', 'die', 'death',
  // Sexual content
  'sex', 'porn', 'nude', 'naked', 'penis', 'vagina', 'boob', 'tit',
  // Leetspeak variations
  'f*ck', 'f**k', 'sh*t', 'sh**', 'b*tch', 'b**ch', 'a**', 'a55',
  'fuk', 'fck', 'sht', 'btch', 'b1tch', 'fvck', 'phuck',
  // Drug references
  'weed', 'cocaine', 'heroin', 'meth', 'drugs', 'dealer', 'addict',
  // Violence
  'murder', 'suicide', 'bomb', 'gun', 'weapon', 'violence', 'hurt',
  // Spam/nonsense
  'aaa', 'bbb', 'ccc', 'ddd', 'eee', 'fff', 'ggg', 'hhh', 'iii',
  'jjj', 'kkk', 'lll', 'mmm', 'nnn', 'ooo', 'ppp', 'qqq', 'rrr',
  'sss', 'ttt', 'uuu', 'vvv', 'www', 'xxx', 'yyy', 'zzz',
  '111', '222', '333', '444', '555', '666', '777', '888', '999',
  'test', 'testing', 'temp', 'temporary', 'delete', 'remove'
];

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
      // Step 1: Basic sanitization
      const sanitized = this.sanitizeName(name);
      
      // Step 2: Length validation
      const lengthResult = this.validateLength(sanitized);
      if (!lengthResult.isValid) return lengthResult;
      
      // Step 3: Character validation
      const charResult = this.validateCharacters(sanitized);
      if (!charResult.isValid) return charResult;
      
      // Step 4: Profanity filter
      const profanityResult = this.validateProfanity(sanitized);
      if (!profanityResult.isValid) return profanityResult;
      
      // Step 5: Reserved names check
      const reservedResult = this.validateReservedNames(sanitized);
      if (!reservedResult.isValid) return reservedResult;
      
      // Step 6: PII filter
      const piiResult = this.validatePII(sanitized);
      if (!piiResult.isValid) return piiResult;
      
      // Step 7: Uniqueness check
      const uniqueResult = await this.validateUniqueness(sanitized, excludeTeamId);
      if (!uniqueResult.isValid) return uniqueResult;
      
      return {
        isValid: true,
        sanitizedName: sanitized
      };
      
    } catch (error) {
      console.error('Team name validation error:', error);
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
   * Validates against profanity list
   */
  private static validateProfanity(name: string): TeamNameValidationResult {
    const lowerName = name.toLowerCase();
    
    for (const word of PROFANITY_LIST) {
      if (lowerName.includes(word.toLowerCase())) {
        return {
          isValid: false,
          error: 'This name is not available. Please choose a different name.'
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
      const conditions = [sql`LOWER(${teams.name}) = LOWER(${name})`];
      
      // Exclude current team if updating
      if (excludeTeamId) {
        conditions.push(ne(teams.id, excludeTeamId));
      }
      
      const existingTeams = await db
        .select()
        .from(teams)
        .where(and(...conditions));
      
      if (existingTeams.length > 0) {
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