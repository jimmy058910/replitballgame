import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TeamNameValidator } from '../services/teamNameValidation';
import { isAuthenticated } from '../googleAuth';
import { asyncHandler } from '../services/errorService';

const router = Router();

// Schema for team name validation request
const validateNameSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  excludeTeamId: z.string().optional()
});

// Schema for name suggestion request
const suggestNamesSchema = z.object({
  baseName: z.string().min(1, 'Base name is required'),
  excludeTeamId: z.string().optional()
});

/**
 * POST /api/team-names/validate
 * Validates a team name against all rules
 */
router.post('/validate', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { name, excludeTeamId } = validateNameSchema.parse(req.body);
  
  const result = await TeamNameValidator.validateTeamName(name, excludeTeamId);
  
  res.json({
    isValid: result.isValid,
    error: result.error,
    sanitizedName: result.sanitizedName,
    rules: TeamNameValidator.getValidationRules()
  });
}));

/**
 * POST /api/team-names/validate-with-suggestions
 * Validates a team name and provides suggestions if invalid
 */
router.post('/validate-with-suggestions', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { baseName, excludeTeamId } = suggestNamesSchema.parse(req.body);
  
  const { result, suggestions } = await TeamNameValidator.validateWithSuggestions(baseName, excludeTeamId);
  
  res.json({
    isValid: result.isValid,
    error: result.error,
    sanitizedName: result.sanitizedName,
    suggestions: suggestions || [],
    rules: TeamNameValidator.getValidationRules()
  });
}));

/**
 * GET /api/team-names/rules
 * Gets the validation rules for display in UI
 */
router.get('/rules', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    rules: TeamNameValidator.getValidationRules()
  });
}));

/**
 * POST /api/team-names/check-availability
 * Quick availability check (just uniqueness)
 */
router.post('/check-availability', isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { name } = z.object({ name: z.string() }).parse(req.body);
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  // Just check uniqueness for real-time feedback
  const result = await TeamNameValidator.validateTeamName(name);
  const isAvailable = result.isValid || (result.error && !result.error.includes('already taken'));
  
  res.json({
    available: isAvailable,
    message: isAvailable ? 'Name is available' : 'Name is already taken'
  });
}));

export default router;