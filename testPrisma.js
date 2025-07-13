// Import PrismaClient using ES Module syntax
import { PrismaClient } from './generated/prisma/index.js'; // Path for ES Modules often needs /index.js
const prisma = new PrismaClient();

async function main() {
  console.log('Starting Prisma test script...');

  // Create a new UserProfile
  try {
    const uniqueUserId = `user_${Date.now()}`;
    console.log(`Attempting to create profile for userId: ${uniqueUserId}`);

    const newUserProfile = await prisma.userProfile.create({
      data: {
        userId: uniqueUserId,
        bio: 'This is a test bio from Jules!',
      },
    });
    console.log('Created new UserProfile:', newUserProfile);

    // Read the created UserProfile by its auto-generated id
    const foundProfileById = await prisma.userProfile.findUnique({
      where: {
        id: newUserProfile.id,
      },
    });
    console.log('Found UserProfile by id:', foundProfileById);

    // Read the created UserProfile by userId
    const foundProfileByUserId = await prisma.userProfile.findUnique({
      where: {
        userId: newUserProfile.userId,
      },
    });
    console.log('Found UserProfile by userId:', foundProfileByUserId);

  } catch (e) {
    console.error('Error in Prisma script:', e);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected Prisma Client.');
  }
}

main()
  .then(() => {
    console.log('Prisma script finished.');
  })
  .catch((e) => {
    console.error('Unhandled error in main:', e);
    // process.exit(1); // Optional: exit if there's an unhandled error
  });