import { getPrismaClient } from '../database.js';

/**
 * Ensures UserProfile records exist for all teams in the database.
 * This handles the proper association between Firebase Auth UIDs and teams.
 */
async function ensureUserProfiles() {
  const prisma = await getPrismaClient();
  
  try {
    console.log('🔍 Checking for teams without proper UserProfile associations...\n');
    
    // Find all teams
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        userProfileId: true,
        division: true,
        subdivision: true
      }
    });
    
    console.log(`Found ${teams.length} teams in database\n`);
    
    for (const team of teams) {
      // Check if team has userProfileId
      if (!team.userProfileId) {
        console.log(`⚠️  Team "${team.name}" (ID: ${team.id}) has no userProfileId`);
        
        // For Oakland Cougars specifically, create the needed UserProfile
        if (team.name === 'Oakland Cougars') {
          console.log(`    Special handling for Oakland Cougars team`);
          
          const oaklandUserId = 'oakland-cougars-owner';
          
          // Check if UserProfile exists for this userId
          let userProfile = await prisma.userProfile.findUnique({
            where: { userId: oaklandUserId }
          });
          
          if (!userProfile) {
            console.log(`    Creating UserProfile for Oakland Cougars owner`);
            
            userProfile = await prisma.userProfile.create({
              data: {
                userId: oaklandUserId,
                email: 'oakland.cougars@realmrivalry.dev',
                firstName: 'Oakland Cougars',
                lastName: 'Owner',
                hasSeenOnboarding: true,
                hasTeam: true
              }
            });
            console.log(`    ✅ Created UserProfile with ID: ${userProfile.id}`);
          } else {
            console.log(`    ✅ UserProfile already exists with ID: ${userProfile.id}`);
          }
          
          // Update team to use userProfileId
          await prisma.team.update({
            where: { id: team.id },
            data: {
              userProfileId: userProfile.id
            }
          });
          console.log(`    ✅ Updated Oakland Cougars to use userProfileId\n`);
        } else {
          console.log(`    ℹ️  Team needs manual association or is an AI team\n`);
        }
      } else {
        // Team already has userProfileId, check if it's valid
        const userProfile = await prisma.userProfile.findUnique({
          where: { id: team.userProfileId }
        });
        
        if (!userProfile) {
          console.log(`❌ Team "${team.name}" has invalid userProfileId: ${team.userProfileId}\n`);
        } else {
          console.log(`✅ Team "${team.name}" properly associated with UserProfile ${userProfile.email}`);
        }
      }
    }
    
    // Specifically check Oakland Cougars
    console.log('\n🎯 Verifying Oakland Cougars team association...');
    const oaklandTeam = await prisma.team.findFirst({
      where: { name: 'Oakland Cougars' },
      include: { user: true }
    });
    
    if (oaklandTeam) {
      if (oaklandTeam.user) {
        console.log(`✅ Oakland Cougars is properly associated with UserProfile:`);
        console.log(`   UserProfile ID: ${oaklandTeam.user.id}`);
        console.log(`   Firebase UID: ${oaklandTeam.user.userId}`);
        console.log(`   Email: ${oaklandTeam.user.email}`);
      } else {
        console.log(`❌ Oakland Cougars has no UserProfile association`);
      }
    } else {
      console.log(`❌ Oakland Cougars team not found in database`);
    }
    
    console.log('\n✅ UserProfile check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
ensureUserProfiles().catch(console.error);