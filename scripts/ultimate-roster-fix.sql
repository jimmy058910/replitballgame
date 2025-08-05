-- Ultimate Oakland Cougars Roster Creation
-- Using only valid enum values

INSERT INTO "Player" (
  "teamId", "firstName", "lastName", race, role, age, 
  speed, power, throwing, catching, kicking, "staminaAttribute", 
  leadership, agility, "potentialRating", "dailyStaminaLevel", 
  "injuryStatus", "injuryRecoveryPointsNeeded", "injuryRecoveryPointsCurrent",
  "dailyItemsUsed", "careerInjuries", "gamesPlayedLastSeason",
  "isOnMarket", "isRetired", "camaraderieScore", "createdAt", "updatedAt"
)
SELECT 
  (SELECT id FROM "Team" WHERE name = 'Oakland Cougars'),
  player_data.first_name,
  player_data.last_name,
  player_data.race::text::"Race",
  player_data.position::text::"PlayerRole",
  20 + (RANDOM() * 8)::int,   -- age 20-28
  45 + (RANDOM() * 20)::int,  -- speed 45-65
  45 + (RANDOM() * 20)::int,  -- power 45-65
  CASE WHEN player_data.position = 'PASSER' THEN 55 + (RANDOM() * 20)::int ELSE 25 + (RANDOM() * 25)::int END, -- throwing
  CASE WHEN player_data.position = 'RUNNER' THEN 55 + (RANDOM() * 20)::int ELSE 25 + (RANDOM() * 25)::int END, -- catching
  15 + (RANDOM() * 30)::int,  -- kicking 15-45
  90 + (RANDOM() * 10)::int,  -- stamina 90-100
  40 + (RANDOM() * 30)::int,  -- leadership 40-70
  45 + (RANDOM() * 20)::int,  -- agility 45-65
  7.5 + (RANDOM() * 2.5),     -- potential 7.5-10.0
  100,                        -- daily stamina (full)
  'HEALTHY'::"InjuryStatus",  -- healthy status
  0,                          -- injury recovery needed
  0,                          -- injury recovery current
  0,                          -- daily items used
  0,                          -- career injuries (new players)
  0,                          -- games played last season (rookies)
  false,                      -- not on market
  false,                      -- not retired
  7.5 + (RANDOM() * 2.5),     -- camaraderie 7.5-10.0
  NOW(),
  NOW()
FROM (VALUES
  ('Jake', 'Thompson', 'HUMAN', 'PASSER'),
  ('Marcus', 'Johnson', 'SYLVAN', 'PASSER'), 
  ('Ryan', 'Wilson', 'GRYLL', 'PASSER'),
  ('David', 'Rodriguez', 'GRYLL', 'BLOCKER'),
  ('Michael', 'Brown', 'HUMAN', 'BLOCKER'),
  ('Chris', 'Davis', 'GRYLL', 'BLOCKER'),
  ('James', 'Miller', 'GRYLL', 'BLOCKER'),
  ('Alex', 'Garcia', 'SYLVAN', 'RUNNER'),
  ('Kevin', 'Martinez', 'LUMINA', 'RUNNER'),
  ('Tyler', 'Anderson', 'HUMAN', 'RUNNER'),
  ('Brandon', 'Lee', 'SYLVAN', 'RUNNER'),
  ('Jordan', 'Taylor', 'UMBRA', 'RUNNER')
) AS player_data(first_name, last_name, race, position)
WHERE (SELECT id FROM "Team" WHERE name = 'Oakland Cougars') IS NOT NULL;

-- Final verification - your complete Oakland Cougars roster
SELECT 
  '🏈 OAKLAND COUGARS ROSTER COMPLETE! 🏈' as success_message,
  (SELECT COUNT(*) FROM "Player" WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars')) as total_players,
  (SELECT COUNT(*) FROM "Staff" WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars')) as total_staff;

SELECT 
  'PLAYERS BY POSITION:' as roster_breakdown,
  role::text as position,
  COUNT(*) as count
FROM "Player" 
WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars')
GROUP BY role
ORDER BY role;

SELECT 
  'FULL PLAYER ROSTER:' as details, 
  "firstName", 
  "lastName", 
  race::text, 
  role::text,
  speed,
  power,
  throwing,
  catching
FROM "Player" 
WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars') 
ORDER BY role, "firstName";