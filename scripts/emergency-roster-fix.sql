-- Emergency Production Roster Fix for Oakland Cougars
-- Execute this to create complete team for jimmy058910@gmail.com

-- Step 1: Create Season
INSERT INTO "Season" (id, "seasonNumber", "startDate", "endDate", "currentDay", phase, "createdAt") 
VALUES ('season-1', 1, NOW(), NOW() + INTERVAL '17 days', 1, 'REGULAR_SEASON', NOW())
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create League  
INSERT INTO "League" (id, name, division, "seasonId") 
VALUES (1, 'Main League', 8, 'season-1')
ON CONFLICT (id) DO NOTHING;

-- Step 3: Create User Profile (already exists but ensure it's there)
INSERT INTO "UserProfile" ("userId", email, "firstName", "lastName", "ndaAccepted", "ndaAcceptedAt", "ndaVersion", "createdAt", "updatedAt")
VALUES ('jimmy058910@gmail.com', 'jimmy058910@gmail.com', 'Jimmy', 'User', true, NOW(), '1.0', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Step 4: Create Oakland Cougars Team
INSERT INTO "Team" ("userProfileId", name, "camaraderie", "fanLoyalty", "homeField", "tacticalFocus", "leagueId", division, subdivision, wins, losses, points, "createdAt", "updatedAt")
VALUES (
  (SELECT id FROM "UserProfile" WHERE email = 'jimmy058910@gmail.com'),
  'Oakland Cougars',
  75.0,
  70.0,
  'STANDARD',
  'BALANCED', 
  1,
  8,
  'B',
  0,
  0,
  0,
  NOW(),
  NOW()
) ON CONFLICT ("userProfileId") DO NOTHING;

-- Step 5: Create 12 Players for Oakland Cougars
INSERT INTO "Player" ("teamId", name, position, race, speed, agility, strength, stamina, awareness, confidence, passing, blocking, tackling, catching, kicking, age, salary, energy, morale, "teamChemistry", "createdAt", "updatedAt")
SELECT 
  (SELECT id FROM "Team" WHERE name = 'Oakland Cougars'),
  player_data.name,
  player_data.position,
  player_data.race,
  45 + (RANDOM() * 20)::int,  -- speed 45-65
  45 + (RANDOM() * 20)::int,  -- agility 45-65
  45 + (RANDOM() * 20)::int,  -- strength 45-65
  45 + (RANDOM() * 20)::int,  -- stamina 45-65
  45 + (RANDOM() * 20)::int,  -- awareness 45-65
  45 + (RANDOM() * 20)::int,  -- confidence 45-65
  CASE WHEN player_data.position = 'PASSER' THEN 55 + (RANDOM() * 20)::int ELSE 25 + (RANDOM() * 25)::int END, -- passing
  CASE WHEN player_data.position = 'BLOCKER' THEN 55 + (RANDOM() * 20)::int ELSE 25 + (RANDOM() * 25)::int END, -- blocking
  35 + (RANDOM() * 20)::int,  -- tackling 35-55
  CASE WHEN player_data.position = 'RUNNER' THEN 45 + (RANDOM() * 20)::int ELSE 25 + (RANDOM() * 25)::int END, -- catching
  15 + (RANDOM() * 30)::int,  -- kicking 15-45
  20 + (RANDOM() * 8)::int,   -- age 20-28
  35000 + (RANDOM() * 40000)::int, -- salary 35k-75k
  100,                        -- energy
  75 + (RANDOM() * 15)::int,  -- morale 75-90
  65 + (RANDOM() * 15)::int,  -- team chemistry 65-80
  NOW(),
  NOW()
FROM (VALUES
  ('Jake Thompson', 'PASSER', 'HUMAN'),
  ('Marcus Johnson', 'PASSER', 'ELF'), 
  ('Ryan Wilson', 'PASSER', 'DWARF'),
  ('David Rodriguez', 'BLOCKER', 'ORC'),
  ('Michael Brown', 'BLOCKER', 'HUMAN'),
  ('Chris Davis', 'BLOCKER', 'DWARF'),
  ('James Miller', 'BLOCKER', 'ORC'),
  ('Alex Garcia', 'RUNNER', 'ELF'),
  ('Kevin Martinez', 'RUNNER', 'HALFLING'),
  ('Tyler Anderson', 'RUNNER', 'HUMAN'),
  ('Brandon Lee', 'RUNNER', 'ELF'),
  ('Jordan Taylor', 'RUNNER', 'HALFLING')
) AS player_data(name, position, race);

-- Step 6: Create 7 Staff Members for Oakland Cougars
INSERT INTO "Staff" ("teamId", name, role, effectiveness, salary, "contractLength", "createdAt", "updatedAt")
SELECT
  (SELECT id FROM "Team" WHERE name = 'Oakland Cougars'),
  staff_data.name,
  staff_data.role,
  65 + (RANDOM() * 25)::int,  -- effectiveness 65-90
  45000 + (RANDOM() * 25000)::int, -- salary 45k-70k
  2 + (RANDOM() * 3)::int,    -- contract 2-5 years
  NOW(),
  NOW()
FROM (VALUES
  ('Coach Williams', 'HEAD_COACH'),
  ('Dr. Sarah Chen', 'RECOVERY_SPECIALIST'),
  ('Coach Mitchell', 'PASSER_TRAINER'),
  ('Coach Roberts', 'BLOCKER_TRAINER'),
  ('Coach Jackson', 'RUNNER_TRAINER'),
  ('Scout Peterson', 'SCOUT'),
  ('Scout Morgan', 'SCOUT')
) AS staff_data(name, role);

-- Verification queries
SELECT 'User created:' as status, email FROM "UserProfile" WHERE email = 'jimmy058910@gmail.com';
SELECT 'Team created:' as status, name FROM "Team" WHERE name = 'Oakland Cougars';
SELECT 'Players created:' as status, COUNT(*) as count FROM "Player" WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars');
SELECT 'Staff created:' as status, COUNT(*) as count FROM "Staff" WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars');