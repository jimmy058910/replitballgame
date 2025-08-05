-- Final Player Creation for Oakland Cougars
-- Using correct PlayerRole enum type

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
  ('Marcus', 'Johnson', 'ELF', 'PASSER'), 
  ('Ryan', 'Wilson', 'DWARF', 'PASSER'),
  ('David', 'Rodriguez', 'ORC', 'BLOCKER'),
  ('Michael', 'Brown', 'HUMAN', 'BLOCKER'),
  ('Chris', 'Davis', 'DWARF', 'BLOCKER'),
  ('James', 'Miller', 'ORC', 'BLOCKER'),
  ('Alex', 'Garcia', 'ELF', 'RUNNER'),
  ('Kevin', 'Martinez', 'HALFLING', 'RUNNER'),
  ('Tyler', 'Anderson', 'HUMAN', 'RUNNER'),
  ('Brandon', 'Lee', 'ELF', 'RUNNER'),
  ('Jordan', 'Taylor', 'HALFLING', 'RUNNER')
) AS player_data(first_name, last_name, race, position)
WHERE (SELECT id FROM "Team" WHERE name = 'Oakland Cougars') IS NOT NULL;

-- Final verification
SELECT 'Final Status:' as info, 
  (SELECT COUNT(*) FROM "Player" WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars')) as players,
  (SELECT COUNT(*) FROM "Staff" WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars')) as staff;

SELECT 'Player Roster:' as info, "firstName", "lastName", race::text, role::text 
FROM "Player" 
WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars') 
ORDER BY role, "firstName";