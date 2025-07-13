// This file is deprecated. All routes have been moved to the server/routes/ directory.
// Please import routes from server/routes/index.ts using the registerAllRoutes function.

// Shared helper functions or types that were previously here should be moved to:
// - Respective new route files if specific to those routes.
// - Relevant service files (e.g., teamService.ts, playerService.ts) if they contain business logic.
// - A shared utility directory (e.g., server/utils/ or shared/utils/) if they are generic helpers.

// Example of what might have been here and where it should go:
// - Stripe instance: Moved to server/routes/paymentRoutes.ts (or a stripeService.ts)
// - Zod schemas (createTeamSchema, etc.): Moved to the top of relevant new route files or a shared schema validation file.
// - calculateTeamPower: Moved to server/routes/teamRoutes.ts temporarily, with a TODO to move to a service.
// - createAITeamsForDivision: Moved to server/routes/leagueRoutes.ts temporarily, with a TODO to move to a service.

// The main `registerRoutes` function that took `app` as an argument is now replaced by
// `registerAllRoutes` in `server/routes/index.ts`.
// The `createServer(app)` call is handled in `server/index.ts`.

export {}; // Add this line if the file becomes completely empty to satisfy module requirements.
