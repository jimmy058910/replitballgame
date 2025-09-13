-- SCHEDULE RESET SCRIPT
-- Resets games for Days 8-14 back to SCHEDULED status with proper dates
-- This will allow normal progression testing to continue

-- Show current status
SELECT 
  'Current Game Status' as info,
  "gameDay",
  status,
  COUNT(*) as count,
  MIN("homeScore") as min_home_score,
  MAX("homeScore") as max_home_score,
  AVG("homeScore") as avg_home_score
FROM "Game" 
WHERE "gameDay" BETWEEN 8 AND 14 
  AND "scheduleId" IS NOT NULL
GROUP BY "gameDay", status
ORDER BY "gameDay", status;

-- Reset games for Days 8-14 back to SCHEDULED
UPDATE "Game" 
SET 
  status = 'SCHEDULED',
  "homeScore" = NULL,
  "awayScore" = NULL,
  "gameDate" = CASE 
    WHEN "gameDay" = 8 THEN '2024-09-19 15:00:00'::timestamp  -- Day 8: Past time for smart progression
    WHEN "gameDay" = 9 THEN '2024-09-20 19:00:00'::timestamp  -- Day 9: Future time 
    WHEN "gameDay" = 10 THEN '2024-09-21 19:00:00'::timestamp -- Day 10: Future time
    WHEN "gameDay" = 11 THEN '2024-09-22 19:00:00'::timestamp -- Day 11: Future time
    WHEN "gameDay" = 12 THEN '2024-09-23 19:00:00'::timestamp -- Day 12: Future time
    WHEN "gameDay" = 13 THEN '2024-09-24 19:00:00'::timestamp -- Day 13: Future time
    WHEN "gameDay" = 14 THEN '2024-09-25 19:00:00'::timestamp -- Day 14: Future time
    ELSE "gameDate"
  END
WHERE "gameDay" BETWEEN 8 AND 14 
  AND "scheduleId" IS NOT NULL
  AND status = 'COMPLETED';

-- Show results
SELECT 
  'Reset Results' as info,
  "gameDay",
  status,
  COUNT(*) as count,
  MIN("gameDate") as earliest_game,
  MAX("gameDate") as latest_game
FROM "Game" 
WHERE "gameDay" BETWEEN 8 AND 14 
  AND "scheduleId" IS NOT NULL
GROUP BY "gameDay", status
ORDER BY "gameDay", status;

-- Summary message
SELECT 
  'SCHEDULE RESET COMPLETE!' as message,
  'Day 8 games will be re-simulated with proper scoring (15-30 points)' as day_8_fix,
  'Days 9-14 games are now scheduled for future dates' as future_games_fix,
  'Normal progression testing can now continue' as next_steps;