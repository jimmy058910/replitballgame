-- Fix Oakland Cougars roster with proper race-specific names
-- Replace generic human names with authentic fantasy names

-- Update HUMAN players with proper Human names
UPDATE "Player" 
SET "firstName" = CASE 
  WHEN "firstName" = 'Jake' THEN 'Marcus'
  WHEN "firstName" = 'Michael' THEN 'Viktor'
  WHEN "firstName" = 'Tyler' THEN 'Alexander'
  ELSE "firstName"
END,
"lastName" = CASE 
  WHEN "lastName" = 'Thompson' THEN 'Swift'
  WHEN "lastName" = 'Brown' THEN 'Storm'
  WHEN "lastName" = 'Anderson' THEN 'Steel'
  ELSE "lastName"
END
WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars') 
  AND race = 'HUMAN';

-- Update SYLVAN players with proper Elvish names
UPDATE "Player" 
SET "firstName" = CASE 
  WHEN "firstName" = 'Marcus' THEN 'Elysian'
  WHEN "firstName" = 'Alex' THEN 'Thornwick'
  WHEN "firstName" = 'Brandon' THEN 'Starleaf'
  ELSE "firstName"
END,
"lastName" = CASE 
  WHEN "lastName" = 'Johnson' THEN 'Moonwhisper'
  WHEN "lastName" = 'Garcia' THEN 'Silverleaf'
  WHEN "lastName" = 'Lee' THEN 'Starweaver'
  ELSE "lastName"
END
WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars') 
  AND race = 'SYLVAN';

-- Update GRYLL players with proper Orcish names  
UPDATE "Player" 
SET "firstName" = CASE 
  WHEN "firstName" = 'Ryan' THEN 'Grimjaw'
  WHEN "firstName" = 'David' THEN 'Ironhide'
  WHEN "firstName" = 'Chris' THEN 'Bloodfang'
  WHEN "firstName" = 'James' THEN 'Stormcrusher'
  ELSE "firstName"
END,
"lastName" = CASE 
  WHEN "lastName" = 'Wilson' THEN 'Bonecrusher'
  WHEN "lastName" = 'Rodriguez' THEN 'Ironhide'
  WHEN "lastName" = 'Davis' THEN 'Stormrage'
  WHEN "lastName" = 'Miller' THEN 'Ragefist'
  ELSE "lastName"
END
WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars') 
  AND race = 'GRYLL';

-- Update LUMINA players with proper Light-themed names
UPDATE "Player" 
SET "firstName" = CASE 
  WHEN "firstName" = 'Kevin' THEN 'Radiance'
  ELSE "firstName"
END,
"lastName" = CASE 
  WHEN "lastName" = 'Martinez' THEN 'Starfire'
  ELSE "lastName"
END
WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars') 
  AND race = 'LUMINA';

-- Update UMBRA players with proper Shadow-themed names
UPDATE "Player" 
SET "firstName" = CASE 
  WHEN "firstName" = 'Jordan' THEN 'Shadowmere'
  ELSE "firstName"
END,
"lastName" = CASE 
  WHEN "lastName" = 'Taylor' THEN 'Darkbane'
  ELSE "lastName"
END
WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars') 
  AND race = 'UMBRA';

-- Verify the fixed roster with proper race-specific names
SELECT 
  'FIXED OAKLAND COUGARS ROSTER:' as status,
  "firstName", 
  "lastName", 
  race::text, 
  role::text
FROM "Player" 
WHERE "teamId" = (SELECT id FROM "Team" WHERE name = 'Oakland Cougars') 
ORDER BY race, role, "firstName";