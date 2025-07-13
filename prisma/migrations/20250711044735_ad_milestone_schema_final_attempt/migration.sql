/*
  Warnings:

  - You are about to drop the column `adsWatchedCount` on the `AdRewardMilestone` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AdRewardMilestone" DROP COLUMN "adsWatchedCount",
ADD COLUMN     "adsWatchedToday" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalAdsWatched" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "AdRewardMilestone" ADD CONSTRAINT "AdRewardMilestone_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
