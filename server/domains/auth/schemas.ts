import { z } from 'zod.js';

// Authentication request/response schemas
export const authSchemas: {
  userProfile: z.ZodObject<any>,
  loginRequest: z.ZodObject<any>,
  tokenResponse: z.ZodObject<any>
} = {
  // User profile response
  userProfile: z.object({
    id: z.number(),
    userId: z.string(),
    email: z.string().email(),
    username: z.string().optional(),
    avatar: z.string().optional(),
    isAdmin: z.boolean().default(false),
    createdAt: z.date(),
    updatedAt: z.date()
  }),

  // Login request
  loginRequest: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  }),

  // Token response
  tokenResponse: z.object({
    token: z.string(),
    refreshToken: z.string().optional(),
    expiresIn: z.number(),
    user: z.lazy((): z.ZodObject<any> => authSchemas.userProfile)
  })
};

export type UserProfile = z.infer<typeof authSchemas.userProfile>;
export type LoginRequest = z.infer<typeof authSchemas.loginRequest>;
export type TokenResponse = z.infer<typeof authSchemas.tokenResponse>;