// Quick script to fix UserProfile linkage for Oakland Cougars team
const { PrismaClient } = require('./prisma/generated/client');

async function fixUserProfile() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://realm_app:qGlB8JhxixnZoxZvCvbdcBKFKDsOE5rCyi8iQA2BJKw=@localhost:5432/realm_rivalry?schema=public&sslmode=prefer"
      }
    }
  });

  try {
    console.log('🔍 Checking Oakland Cougars team...');
    
    // Find Oakland Cougars team
    const oaklandCougars = await prisma.team.findFirst({
      where: { name: 'Oakland Cougars' },
      include: { user: true }
    });
    
    console.log('Oakland Cougars team:', JSON.stringify(oaklandCougars, null, 2));
    
    if (!oaklandCougars) {
      console.log('❌ Oakland Cougars team not found');
      return;
    }
    
    // Check if UserProfile exists for dev-user-123
    const existingUserProfile = await prisma.userProfile.findUnique({
      where: { userId: 'dev-user-123' }
    });
    
    console.log('Existing UserProfile for dev-user-123:', existingUserProfile);
    
    if (!existingUserProfile) {
      console.log('✅ Creating UserProfile for dev-user-123...');
      
      const newUserProfile = await prisma.userProfile.create({
        data: {
          userId: 'dev-user-123',
          email: 'developer@realmrivalry.com',
          firstName: 'Development',
          lastName: 'User'
        }
      });
      
      console.log('Created UserProfile:', newUserProfile);
      
      // Link Oakland Cougars to the new UserProfile
      console.log('✅ Linking Oakland Cougars to UserProfile...');
      
      await prisma.team.update({
        where: { id: oaklandCougars.id },
        data: { userProfileId: newUserProfile.id }
      });
      
      console.log('✅ Oakland Cougars successfully linked to dev-user-123!');
      
    } else {
      console.log('✅ UserProfile exists, linking to Oakland Cougars...');
      
      await prisma.team.update({
        where: { id: oaklandCougars.id },
        data: { userProfileId: existingUserProfile.id }
      });
      
      console.log('✅ Oakland Cougars successfully linked to existing UserProfile!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserProfile().catch(console.error);