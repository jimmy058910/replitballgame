/*
  Warnings:

  - You are about to drop the `ad_views` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `auction_bids` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exhibition_games` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `facility_upgrades` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `league_standings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `leagues` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `marketplace_bids` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `marketplace_escrow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `marketplace_listings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `match_consumables` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `matches` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mvp_awards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `player_auctions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `player_development_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `player_injuries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `player_match_stats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `player_skills` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `players` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `season_awards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `seasons` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `skills` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stadium_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stadium_revenue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stadiums` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `staff` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `team_awards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `team_finances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `team_inventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `team_match_stats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `team_season_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teams` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tournament_entries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tournaments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[referralCode]` on the table `UserProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "FieldSize" AS ENUM ('STANDARD', 'LARGE', 'SMALL');

-- CreateEnum
CREATE TYPE "TacticalFocus" AS ENUM ('BALANCED', 'ALL_OUT_ATTACK', 'DEFENSIVE_WALL');

-- CreateEnum
CREATE TYPE "Race" AS ENUM ('HUMAN', 'SYLVAN', 'GRYLL', 'LUMINA', 'UMBRA');

-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('PASSER', 'RUNNER', 'BLOCKER');

-- CreateEnum
CREATE TYPE "InjuryStatus" AS ENUM ('HEALTHY', 'MINOR_INJURY', 'MODERATE_INJURY', 'SEVERE_INJURY');

-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('PASSIVE', 'ACTIVE');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('UNIVERSAL', 'ROLE', 'RACE');

-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('HEAD_COACH', 'PASSER_TRAINER', 'RUNNER_TRAINER', 'BLOCKER_TRAINER', 'RECOVERY_SPECIALIST', 'SCOUT');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('EQUIPMENT', 'CONSUMABLE_RECOVERY', 'CONSUMABLE_BOOSTER', 'TROPHY', 'GAME_ENTRY', 'COSMETIC');

-- CreateEnum
CREATE TYPE "EquipmentSlot" AS ENUM ('HELMET', 'FOOTWEAR', 'GLOVES', 'ARMOR');

-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'UNIQUE');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('LEAGUE', 'TOURNAMENT_DAILY', 'TOURNAMENT_MIDSEASON', 'EXHIBITION', 'PLAYOFF');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SeasonPhase" AS ENUM ('REGULAR_SEASON', 'PLAYOFFS', 'OFF_SEASON', 'PRE_SEASON');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CONTRACT_ALERT', 'INJURY_UPDATE', 'MARKETPLACE_BID', 'MARKETPLACE_SOLD', 'MARKETPLACE_EXPIRED', 'SCOUTING_REPORT', 'MATCH_RESULT', 'TOURNAMENT_UPDATE', 'RECRUIT_SIGNED', 'SYSTEM_MESSAGE', 'TRADE_OFFER', 'TRADE_ACCEPTED', 'TRADE_REJECTED', 'LEAGUE_PROMOTION', 'LEAGUE_DEMOTION', 'NEW_SEASON', 'PLAYER_RETIRED', 'PLAYER_PROGRESSED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('GEMS', 'CREDITS', 'ITEM', 'PREMIUM_BOX');

-- CreateEnum
CREATE TYPE "TournamentType" AS ENUM ('DAILY_DIVISIONAL', 'MID_SEASON_CLASSIC', 'SPECIAL_EVENT');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "ad_views" DROP CONSTRAINT "ad_views_user_id_fkey";

-- DropForeignKey
ALTER TABLE "auction_bids" DROP CONSTRAINT "auction_bids_auction_id_fkey";

-- DropForeignKey
ALTER TABLE "auction_bids" DROP CONSTRAINT "auction_bids_bidder_id_fkey";

-- DropForeignKey
ALTER TABLE "exhibition_games" DROP CONSTRAINT "exhibition_games_opponent_team_id_fkey";

-- DropForeignKey
ALTER TABLE "exhibition_games" DROP CONSTRAINT "exhibition_games_team_id_fkey";

-- DropForeignKey
ALTER TABLE "facility_upgrades" DROP CONSTRAINT "facility_upgrades_stadium_id_fkey";

-- DropForeignKey
ALTER TABLE "items" DROP CONSTRAINT "items_team_id_fkey";

-- DropForeignKey
ALTER TABLE "league_standings" DROP CONSTRAINT "league_standings_league_id_fkey";

-- DropForeignKey
ALTER TABLE "league_standings" DROP CONSTRAINT "league_standings_team_id_fkey";

-- DropForeignKey
ALTER TABLE "marketplace_bids" DROP CONSTRAINT "marketplace_bids_bidder_team_id_fkey";

-- DropForeignKey
ALTER TABLE "marketplace_bids" DROP CONSTRAINT "marketplace_bids_listing_id_fkey";

-- DropForeignKey
ALTER TABLE "marketplace_escrow" DROP CONSTRAINT "marketplace_escrow_listing_id_fkey";

-- DropForeignKey
ALTER TABLE "marketplace_escrow" DROP CONSTRAINT "marketplace_escrow_team_id_fkey";

-- DropForeignKey
ALTER TABLE "marketplace_listings" DROP CONSTRAINT "marketplace_listings_current_high_bidder_team_id_fkey";

-- DropForeignKey
ALTER TABLE "marketplace_listings" DROP CONSTRAINT "marketplace_listings_player_id_fkey";

-- DropForeignKey
ALTER TABLE "marketplace_listings" DROP CONSTRAINT "marketplace_listings_seller_team_id_fkey";

-- DropForeignKey
ALTER TABLE "match_consumables" DROP CONSTRAINT "match_consumables_match_id_fkey";

-- DropForeignKey
ALTER TABLE "match_consumables" DROP CONSTRAINT "match_consumables_team_id_fkey";

-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_away_team_id_fkey";

-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_home_team_id_fkey";

-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_league_id_fkey";

-- DropForeignKey
ALTER TABLE "mvp_awards" DROP CONSTRAINT "mvp_awards_match_id_fkey";

-- DropForeignKey
ALTER TABLE "mvp_awards" DROP CONSTRAINT "mvp_awards_player_id_fkey";

-- DropForeignKey
ALTER TABLE "mvp_awards" DROP CONSTRAINT "mvp_awards_season_id_fkey";

-- DropForeignKey
ALTER TABLE "mvp_awards" DROP CONSTRAINT "mvp_awards_team_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_team_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_transactions" DROP CONSTRAINT "payment_transactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "player_auctions" DROP CONSTRAINT "player_auctions_highest_bidder_id_fkey";

-- DropForeignKey
ALTER TABLE "player_auctions" DROP CONSTRAINT "player_auctions_player_id_fkey";

-- DropForeignKey
ALTER TABLE "player_auctions" DROP CONSTRAINT "player_auctions_seller_id_fkey";

-- DropForeignKey
ALTER TABLE "player_development_history" DROP CONSTRAINT "player_development_history_player_id_fkey";

-- DropForeignKey
ALTER TABLE "player_injuries" DROP CONSTRAINT "player_injuries_player_id_fkey";

-- DropForeignKey
ALTER TABLE "player_match_stats" DROP CONSTRAINT "player_match_stats_match_id_fkey";

-- DropForeignKey
ALTER TABLE "player_match_stats" DROP CONSTRAINT "player_match_stats_player_id_fkey";

-- DropForeignKey
ALTER TABLE "player_match_stats" DROP CONSTRAINT "player_match_stats_team_id_fkey";

-- DropForeignKey
ALTER TABLE "player_skills" DROP CONSTRAINT "player_skills_player_id_fkey";

-- DropForeignKey
ALTER TABLE "player_skills" DROP CONSTRAINT "player_skills_skill_id_fkey";

-- DropForeignKey
ALTER TABLE "players" DROP CONSTRAINT "players_team_id_fkey";

-- DropForeignKey
ALTER TABLE "season_awards" DROP CONSTRAINT "season_awards_player_id_fkey";

-- DropForeignKey
ALTER TABLE "season_awards" DROP CONSTRAINT "season_awards_season_id_fkey";

-- DropForeignKey
ALTER TABLE "season_awards" DROP CONSTRAINT "season_awards_team_id_fkey";

-- DropForeignKey
ALTER TABLE "stadium_events" DROP CONSTRAINT "stadium_events_stadium_id_fkey";

-- DropForeignKey
ALTER TABLE "stadium_revenue" DROP CONSTRAINT "stadium_revenue_match_id_fkey";

-- DropForeignKey
ALTER TABLE "stadium_revenue" DROP CONSTRAINT "stadium_revenue_stadium_id_fkey";

-- DropForeignKey
ALTER TABLE "stadium_revenue" DROP CONSTRAINT "stadium_revenue_team_id_fkey";

-- DropForeignKey
ALTER TABLE "stadiums" DROP CONSTRAINT "stadiums_team_id_fkey";

-- DropForeignKey
ALTER TABLE "staff" DROP CONSTRAINT "staff_team_id_fkey";

-- DropForeignKey
ALTER TABLE "team_awards" DROP CONSTRAINT "team_awards_season_id_fkey";

-- DropForeignKey
ALTER TABLE "team_awards" DROP CONSTRAINT "team_awards_team_id_fkey";

-- DropForeignKey
ALTER TABLE "team_finances" DROP CONSTRAINT "team_finances_team_id_fkey";

-- DropForeignKey
ALTER TABLE "team_inventory" DROP CONSTRAINT "team_inventory_item_id_fkey";

-- DropForeignKey
ALTER TABLE "team_inventory" DROP CONSTRAINT "team_inventory_team_id_fkey";

-- DropForeignKey
ALTER TABLE "team_match_stats" DROP CONSTRAINT "team_match_stats_match_id_fkey";

-- DropForeignKey
ALTER TABLE "team_match_stats" DROP CONSTRAINT "team_match_stats_team_id_fkey";

-- DropForeignKey
ALTER TABLE "team_season_history" DROP CONSTRAINT "team_season_history_season_id_fkey";

-- DropForeignKey
ALTER TABLE "team_season_history" DROP CONSTRAINT "team_season_history_team_id_fkey";

-- DropForeignKey
ALTER TABLE "teams" DROP CONSTRAINT "teams_user_id_fkey";

-- DropForeignKey
ALTER TABLE "tournament_entries" DROP CONSTRAINT "tournament_entries_team_id_fkey";

-- DropForeignKey
ALTER TABLE "tournament_entries" DROP CONSTRAINT "tournament_entries_tournament_id_fkey";

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredBy" TEXT;

-- DropTable
DROP TABLE "ad_views";

-- DropTable
DROP TABLE "auction_bids";

-- DropTable
DROP TABLE "exhibition_games";

-- DropTable
DROP TABLE "facility_upgrades";

-- DropTable
DROP TABLE "items";

-- DropTable
DROP TABLE "league_standings";

-- DropTable
DROP TABLE "leagues";

-- DropTable
DROP TABLE "marketplace_bids";

-- DropTable
DROP TABLE "marketplace_escrow";

-- DropTable
DROP TABLE "marketplace_listings";

-- DropTable
DROP TABLE "match_consumables";

-- DropTable
DROP TABLE "matches";

-- DropTable
DROP TABLE "mvp_awards";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "payment_transactions";

-- DropTable
DROP TABLE "player_auctions";

-- DropTable
DROP TABLE "player_development_history";

-- DropTable
DROP TABLE "player_injuries";

-- DropTable
DROP TABLE "player_match_stats";

-- DropTable
DROP TABLE "player_skills";

-- DropTable
DROP TABLE "players";

-- DropTable
DROP TABLE "season_awards";

-- DropTable
DROP TABLE "seasons";

-- DropTable
DROP TABLE "sessions";

-- DropTable
DROP TABLE "skills";

-- DropTable
DROP TABLE "stadium_events";

-- DropTable
DROP TABLE "stadium_revenue";

-- DropTable
DROP TABLE "stadiums";

-- DropTable
DROP TABLE "staff";

-- DropTable
DROP TABLE "team_awards";

-- DropTable
DROP TABLE "team_finances";

-- DropTable
DROP TABLE "team_inventory";

-- DropTable
DROP TABLE "team_match_stats";

-- DropTable
DROP TABLE "team_season_history";

-- DropTable
DROP TABLE "teams";

-- DropTable
DROP TABLE "tournament_entries";

-- DropTable
DROP TABLE "tournaments";

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "Session" (
    "sid" TEXT NOT NULL,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "userProfileId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "camaraderie" DOUBLE PRECISION NOT NULL DEFAULT 75.0,
    "fanLoyalty" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "homeField" "FieldSize" NOT NULL DEFAULT 'STANDARD',
    "tacticalFocus" "TacticalFocus" NOT NULL DEFAULT 'BALANCED',
    "leagueId" INTEGER,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "race" "Race" NOT NULL,
    "age" INTEGER NOT NULL,
    "role" "PlayerRole" NOT NULL,
    "speed" INTEGER NOT NULL,
    "power" INTEGER NOT NULL,
    "throwing" INTEGER NOT NULL,
    "catching" INTEGER NOT NULL,
    "kicking" INTEGER NOT NULL,
    "staminaAttribute" INTEGER NOT NULL,
    "leadership" INTEGER NOT NULL,
    "agility" INTEGER NOT NULL,
    "potentialRating" DOUBLE PRECISION NOT NULL,
    "dailyStaminaLevel" INTEGER NOT NULL DEFAULT 100,
    "injuryStatus" "InjuryStatus" NOT NULL DEFAULT 'HEALTHY',
    "injuryRecoveryPointsNeeded" INTEGER NOT NULL DEFAULT 0,
    "injuryRecoveryPointsCurrent" INTEGER NOT NULL DEFAULT 0,
    "dailyItemsUsed" INTEGER NOT NULL DEFAULT 0,
    "careerInjuries" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayedLastSeason" INTEGER NOT NULL DEFAULT 0,
    "isOnMarket" BOOLEAN NOT NULL DEFAULT false,
    "isRetired" BOOLEAN NOT NULL DEFAULT false,
    "camaraderieScore" DOUBLE PRECISION NOT NULL DEFAULT 75.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerEquipment" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "equippedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER,
    "staffId" INTEGER,
    "salary" INTEGER NOT NULL,
    "length" INTEGER NOT NULL,
    "signingBonus" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "SkillType" NOT NULL,
    "category" "SkillCategory" NOT NULL,
    "tiers" JSONB NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSkillLink" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "currentTier" INTEGER NOT NULL DEFAULT 1,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerSkillLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "type" "StaffType" NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "motivation" INTEGER NOT NULL DEFAULT 5,
    "development" INTEGER NOT NULL DEFAULT 5,
    "teaching" INTEGER NOT NULL DEFAULT 5,
    "physiology" INTEGER NOT NULL DEFAULT 5,
    "talentIdentification" INTEGER NOT NULL DEFAULT 5,
    "potentialAssessment" INTEGER NOT NULL DEFAULT 5,
    "tactics" INTEGER NOT NULL DEFAULT 5,
    "age" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamFinances" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "credits" BIGINT NOT NULL DEFAULT 50000,
    "gems" INTEGER NOT NULL DEFAULT 0,
    "projectedIncome" BIGINT NOT NULL DEFAULT 0,
    "projectedExpenses" BIGINT NOT NULL DEFAULT 0,
    "lastSeasonRevenue" BIGINT NOT NULL DEFAULT 0,
    "lastSeasonExpenses" BIGINT NOT NULL DEFAULT 0,
    "facilitiesMaintenanceCost" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamFinances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stadium" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 5000,
    "concessionsLevel" INTEGER NOT NULL DEFAULT 1,
    "parkingLevel" INTEGER NOT NULL DEFAULT 1,
    "vipSuitesLevel" INTEGER NOT NULL DEFAULT 1,
    "merchandisingLevel" INTEGER NOT NULL DEFAULT 1,
    "lightingScreensLevel" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stadium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "slot" "EquipmentSlot",
    "raceRestriction" "Race",
    "statEffects" JSONB,
    "rarity" "ItemRarity" NOT NULL DEFAULT 'COMMON',
    "creditPrice" BIGINT,
    "gemPrice" INTEGER,
    "effectValue" JSONB,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveBoost" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "playerId" INTEGER,
    "itemId" INTEGER NOT NULL,
    "matchType" "MatchType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActiveBoost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "sellerTeamId" INTEGER NOT NULL,
    "startBid" BIGINT NOT NULL,
    "buyNowPrice" BIGINT,
    "currentBid" BIGINT,
    "currentHighBidderTeamId" INTEGER,
    "expiryTimestamp" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" SERIAL NOT NULL,
    "listingId" INTEGER NOT NULL,
    "bidderTeamId" INTEGER NOT NULL,
    "bidAmount" BIGINT NOT NULL,
    "isWinningBid" BOOLEAN NOT NULL DEFAULT false,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "formationJson" JSONB,
    "substitutionJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" SERIAL NOT NULL,
    "division" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "seasonId" INTEGER NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueStanding" (
    "id" SERIAL NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "teamName" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" INTEGER NOT NULL DEFAULT 0,
    "pointsAgainst" INTEGER NOT NULL DEFAULT 0,
    "pointDifferential" INTEGER NOT NULL DEFAULT 0,
    "streak" TEXT NOT NULL DEFAULT 'N/A',
    "rank" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "leagueId" INTEGER,
    "homeTeamId" INTEGER NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "gameDate" TIMESTAMP(3) NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "simulationLog" JSONB,
    "matchType" "MatchType" NOT NULL DEFAULT 'LEAGUE',
    "tournamentId" INTEGER,
    "round" INTEGER,
    "status" "GameStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" SERIAL NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "currentDay" INTEGER NOT NULL DEFAULT 1,
    "phase" "SeasonPhase" NOT NULL DEFAULT 'REGULAR_SEASON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "linkTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TryoutPack" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "creditCost" BIGINT NOT NULL,
    "gemCost" INTEGER,
    "numPlayers" INTEGER NOT NULL,
    "qualityTier" TEXT NOT NULL,

    CONSTRAINT "TryoutPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GemPack" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "gemAmount" INTEGER NOT NULL,
    "usdPrice" DOUBLE PRECISION NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "GemPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditExchangeRate" (
    "id" SERIAL NOT NULL,
    "gems" INTEGER NOT NULL,
    "credits" BIGINT NOT NULL,
    "bonusPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "CreditExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" SERIAL NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "rewardGiven" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedeemCode" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "rewardValue" JSONB NOT NULL,
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedeemCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedeemCodeRecord" (
    "id" SERIAL NOT NULL,
    "redeemCodeId" TEXT NOT NULL,
    "userProfileId" INTEGER NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedeemCodeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdRewardMilestone" (
    "id" SERIAL NOT NULL,
    "userProfileId" INTEGER NOT NULL,
    "adsWatchedCount" INTEGER NOT NULL DEFAULT 0,
    "lastAdWatchedAt" TIMESTAMP(3),

    CONSTRAINT "AdRewardMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PremiumBoxReward" (
    "id" SERIAL NOT NULL,
    "category" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "rewardValue" JSONB NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PremiumBoxReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentReward" (
    "id" SERIAL NOT NULL,
    "boxId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "rarity" "ItemRarity" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "EquipmentReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TournamentType" NOT NULL,
    "division" INTEGER,
    "status" "TournamentStatus" NOT NULL DEFAULT 'REGISTRATION_OPEN',
    "startTime" TIMESTAMP(3) NOT NULL,
    "registrationEndTime" TIMESTAMP(3),
    "entryFeeCredits" BIGINT,
    "entryFeeGems" INTEGER,
    "entryFeeItemId" INTEGER,
    "prizePoolJson" JSONB NOT NULL,
    "seasonDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentEntry" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalRank" INTEGER,
    "rewardsClaimed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TournamentEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_sid_key" ON "Session"("sid");

-- CreateIndex
CREATE INDEX "Session_expire_idx" ON "Session"("expire");

-- CreateIndex
CREATE UNIQUE INDEX "Team_userProfileId_key" ON "Team"("userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerEquipment_playerId_itemId_key" ON "PlayerEquipment"("playerId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_playerId_key" ON "Contract"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_staffId_key" ON "Contract"("staffId");

-- CreateIndex
CREATE INDEX "Contract_playerId_idx" ON "Contract"("playerId");

-- CreateIndex
CREATE INDEX "Contract_staffId_idx" ON "Contract"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSkillLink_playerId_skillId_key" ON "PlayerSkillLink"("playerId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamFinances_teamId_key" ON "TeamFinances"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Stadium_teamId_key" ON "Stadium"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_teamId_itemId_key" ON "InventoryItem"("teamId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceListing_playerId_key" ON "MarketplaceListing"("playerId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_sellerTeamId_idx" ON "MarketplaceListing"("sellerTeamId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_isActive_expiryTimestamp_idx" ON "MarketplaceListing"("isActive", "expiryTimestamp");

-- CreateIndex
CREATE INDEX "Bid_listingId_idx" ON "Bid"("listingId");

-- CreateIndex
CREATE INDEX "Bid_bidderTeamId_idx" ON "Bid"("bidderTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Strategy_teamId_key" ON "Strategy"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "League_name_seasonId_key" ON "League"("name", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueStanding_leagueId_teamId_key" ON "LeagueStanding"("leagueId", "teamId");

-- CreateIndex
CREATE INDEX "Game_homeTeamId_idx" ON "Game"("homeTeamId");

-- CreateIndex
CREATE INDEX "Game_awayTeamId_idx" ON "Game"("awayTeamId");

-- CreateIndex
CREATE INDEX "Game_gameDate_idx" ON "Game"("gameDate");

-- CreateIndex
CREATE UNIQUE INDEX "Season_seasonNumber_key" ON "Season"("seasonNumber");

-- CreateIndex
CREATE INDEX "Notification_teamId_isRead_idx" ON "Notification"("teamId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "TryoutPack_name_key" ON "TryoutPack"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GemPack_name_key" ON "GemPack"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GemPack_productId_key" ON "GemPack"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditExchangeRate_gems_key" ON "CreditExchangeRate"("gems");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referrerUserId_referredUserId_key" ON "Referral"("referrerUserId", "referredUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RedeemCode_id_key" ON "RedeemCode"("id");

-- CreateIndex
CREATE UNIQUE INDEX "RedeemCodeRecord_redeemCodeId_userProfileId_key" ON "RedeemCodeRecord"("redeemCodeId", "userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "AdRewardMilestone_userProfileId_key" ON "AdRewardMilestone"("userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentEntry_tournamentId_teamId_key" ON "TournamentEntry"("tournamentId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_referralCode_key" ON "UserProfile"("referralCode");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerEquipment" ADD CONSTRAINT "PlayerEquipment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerEquipment" ADD CONSTRAINT "PlayerEquipment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkillLink" ADD CONSTRAINT "PlayerSkillLink_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkillLink" ADD CONSTRAINT "PlayerSkillLink_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFinances" ADD CONSTRAINT "TeamFinances_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stadium" ADD CONSTRAINT "Stadium_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveBoost" ADD CONSTRAINT "ActiveBoost_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveBoost" ADD CONSTRAINT "ActiveBoost_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveBoost" ADD CONSTRAINT "ActiveBoost_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_sellerTeamId_fkey" FOREIGN KEY ("sellerTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_currentHighBidderTeamId_fkey" FOREIGN KEY ("currentHighBidderTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_bidderTeamId_fkey" FOREIGN KEY ("bidderTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueStanding" ADD CONSTRAINT "LeagueStanding_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedeemCodeRecord" ADD CONSTRAINT "RedeemCodeRecord_redeemCodeId_fkey" FOREIGN KEY ("redeemCodeId") REFERENCES "RedeemCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedeemCodeRecord" ADD CONSTRAINT "RedeemCodeRecord_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentReward" ADD CONSTRAINT "EquipmentReward_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEntry" ADD CONSTRAINT "TournamentEntry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEntry" ADD CONSTRAINT "TournamentEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
