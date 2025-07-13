-- CreateTable
CREATE TABLE "UserProfile" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_views" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "ad_type" VARCHAR NOT NULL,
    "placement" VARCHAR,
    "reward_type" VARCHAR,
    "reward_amount" INTEGER DEFAULT 0,
    "completed" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "ad_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_bids" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auction_id" UUID NOT NULL,
    "bidder_id" UUID NOT NULL,
    "bid_amount" INTEGER NOT NULL,
    "bid_type" VARCHAR DEFAULT 'standard',
    "max_auto_bid" INTEGER,
    "is_winning" BOOLEAN DEFAULT false,
    "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibition_games" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "opponent_team_id" UUID NOT NULL,
    "result" VARCHAR,
    "score" VARCHAR,
    "played_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "game_data" JSONB,
    "replay_code" VARCHAR,

    CONSTRAINT "exhibition_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facility_upgrades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stadium_id" UUID NOT NULL,
    "upgrade_type" VARCHAR NOT NULL,
    "upgrade_name" VARCHAR NOT NULL,
    "level" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "description" TEXT,
    "effects" JSONB,
    "installed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facility_upgrades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR NOT NULL,
    "type" VARCHAR NOT NULL,
    "rarity" VARCHAR NOT NULL,
    "slot" VARCHAR,
    "stat_boosts" JSONB DEFAULT '{}',
    "description" TEXT,
    "market_value" INTEGER DEFAULT 0,
    "marketplace_price" INTEGER,
    "team_id" UUID,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_standings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "league_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "wins" INTEGER DEFAULT 0,
    "losses" INTEGER DEFAULT 0,
    "draws" INTEGER DEFAULT 0,
    "points" INTEGER DEFAULT 0,
    "goals_for" INTEGER DEFAULT 0,
    "goals_against" INTEGER DEFAULT 0,
    "goal_difference" INTEGER DEFAULT 0,
    "position" INTEGER DEFAULT 1,
    "games_played" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leagues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR NOT NULL,
    "division" INTEGER NOT NULL,
    "season" INTEGER DEFAULT 1,
    "game_day" INTEGER DEFAULT 1,
    "max_teams" INTEGER DEFAULT 8,
    "status" VARCHAR DEFAULT 'active',
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_bids" (
    "id" SERIAL NOT NULL,
    "listing_id" INTEGER NOT NULL,
    "bidder_team_id" UUID NOT NULL,
    "bid_amount" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "bid_timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_escrow" (
    "id" SERIAL NOT NULL,
    "team_id" UUID NOT NULL,
    "listing_id" INTEGER NOT NULL,
    "escrow_amount" INTEGER NOT NULL,
    "escrow_type" VARCHAR(20) NOT NULL,
    "is_released" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(6),

    CONSTRAINT "marketplace_escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" SERIAL NOT NULL,
    "player_id" UUID NOT NULL,
    "seller_team_id" UUID NOT NULL,
    "start_bid" INTEGER NOT NULL,
    "buy_now_price" INTEGER,
    "current_bid" INTEGER NOT NULL,
    "current_high_bidder_team_id" UUID,
    "expiry_timestamp" TIMESTAMP(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "listing_fee" INTEGER NOT NULL,
    "market_tax" INTEGER NOT NULL DEFAULT 5,
    "auction_extensions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_consumables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "match_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "consumable_id" VARCHAR NOT NULL,
    "consumable_name" VARCHAR NOT NULL,
    "effect_type" VARCHAR NOT NULL,
    "effect_data" JSONB NOT NULL,
    "activated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "used_in_match" BOOLEAN DEFAULT false,

    CONSTRAINT "match_consumables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "league_id" UUID,
    "tournament_id" UUID,
    "home_team_id" UUID NOT NULL,
    "away_team_id" UUID NOT NULL,
    "home_score" INTEGER DEFAULT 0,
    "away_score" INTEGER DEFAULT 0,
    "status" VARCHAR DEFAULT 'scheduled',
    "match_type" VARCHAR DEFAULT 'league',
    "game_day" INTEGER,
    "game_data" JSONB,
    "replay_code" VARCHAR,
    "scheduled_time" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mvp_awards" (
    "id" TEXT NOT NULL,
    "match_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "season_id" VARCHAR,
    "award_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "match_type" TEXT NOT NULL,
    "performance_stats" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mvp_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR NOT NULL,
    "type" VARCHAR NOT NULL,
    "title" VARCHAR NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "is_read" BOOLEAN DEFAULT false,
    "priority" VARCHAR DEFAULT 'normal',
    "action_url" VARCHAR,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" VARCHAR(21) NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "team_id" UUID,
    "transaction_type" VARCHAR NOT NULL,
    "item_type" VARCHAR,
    "item_name" VARCHAR,
    "amount" INTEGER,
    "credits_change" INTEGER DEFAULT 0,
    "gems_change" INTEGER DEFAULT 0,
    "status" VARCHAR DEFAULT 'completed',
    "currency" VARCHAR DEFAULT 'usd',
    "payment_method" VARCHAR,
    "stripe_payment_intent_id" VARCHAR,
    "stripe_customer_id" VARCHAR,
    "failure_reason" TEXT,
    "receipt_url" VARCHAR,
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_auctions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "starting_price" INTEGER NOT NULL,
    "current_bid" INTEGER DEFAULT 0,
    "buyout_price" INTEGER,
    "highest_bidder_id" UUID,
    "auction_type" VARCHAR DEFAULT 'standard',
    "reserve_price" INTEGER,
    "start_time" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP(6) NOT NULL,
    "status" VARCHAR DEFAULT 'active',
    "bids_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_development_history" (
    "id" SERIAL NOT NULL,
    "player_id" UUID NOT NULL,
    "season" INTEGER NOT NULL,
    "development_type" VARCHAR(50) NOT NULL,
    "stat_changed" VARCHAR(50),
    "old_value" INTEGER,
    "new_value" INTEGER,
    "progression_chance" REAL,
    "actual_roll" REAL,
    "success" BOOLEAN NOT NULL,
    "age_at_time" INTEGER NOT NULL,
    "games_played_last_season" INTEGER NOT NULL DEFAULT 0,
    "potential_at_time" REAL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_development_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_injuries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id" UUID NOT NULL,
    "injury_type" VARCHAR NOT NULL,
    "injury_name" VARCHAR NOT NULL,
    "description" TEXT,
    "severity" INTEGER NOT NULL,
    "recovery_time" INTEGER NOT NULL,
    "remaining_time" INTEGER NOT NULL,
    "stat_impact" JSONB,
    "treatment_cost" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "injured_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "expected_recovery" TIMESTAMP(6),

    CONSTRAINT "player_injuries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_match_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "player_id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "scores" INTEGER DEFAULT 0,
    "passing_attempts" INTEGER DEFAULT 0,
    "passes_completed" INTEGER DEFAULT 0,
    "passing_yards" INTEGER DEFAULT 0,
    "rushing_yards" INTEGER DEFAULT 0,
    "catches" INTEGER DEFAULT 0,
    "receiving_yards" INTEGER DEFAULT 0,
    "drops" INTEGER DEFAULT 0,
    "fumbles_lost" INTEGER DEFAULT 0,
    "tackles" INTEGER DEFAULT 0,
    "knockdowns_inflicted" INTEGER DEFAULT 0,
    "interceptions_caught" INTEGER DEFAULT 0,
    "passes_defended" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_match_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_skills" (
    "id" SERIAL NOT NULL,
    "player_id" UUID NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "current_tier" INTEGER NOT NULL DEFAULT 1,
    "acquired_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "last_upgraded" TIMESTAMP(6),

    CONSTRAINT "player_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID,
    "first_name" VARCHAR NOT NULL,
    "last_name" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "race" VARCHAR NOT NULL,
    "age" INTEGER NOT NULL,
    "position" VARCHAR DEFAULT 'player',
    "speed" INTEGER NOT NULL,
    "power" INTEGER NOT NULL,
    "throwing" INTEGER NOT NULL,
    "catching" INTEGER NOT NULL,
    "kicking" INTEGER NOT NULL,
    "stamina" INTEGER NOT NULL,
    "leadership" INTEGER NOT NULL,
    "agility" INTEGER NOT NULL,
    "speed_potential" DECIMAL(2,1),
    "power_potential" DECIMAL(2,1),
    "throwing_potential" DECIMAL(2,1),
    "catching_potential" DECIMAL(2,1),
    "kicking_potential" DECIMAL(2,1),
    "stamina_potential" DECIMAL(2,1),
    "leadership_potential" DECIMAL(2,1),
    "agility_potential" DECIMAL(2,1),
    "salary" INTEGER NOT NULL,
    "contract_seasons" INTEGER DEFAULT 3,
    "contract_start_season" INTEGER DEFAULT 1,
    "contract_value" INTEGER NOT NULL,
    "morale" INTEGER DEFAULT 50,
    "is_injured" BOOLEAN DEFAULT false,
    "injury_weeks_remaining" INTEGER DEFAULT 0,
    "injury_type" VARCHAR,
    "is_taxi_squad" BOOLEAN DEFAULT false,
    "field_position" JSONB,
    "is_starter" BOOLEAN DEFAULT false,
    "tactical_role" VARCHAR,
    "is_on_taxi" BOOLEAN DEFAULT false,
    "helmet_item_id" UUID,
    "chest_item_id" UUID,
    "shoes_item_id" UUID,
    "gloves_item_id" UUID,
    "injuries" JSONB DEFAULT '[]',
    "abilities" JSONB DEFAULT '[]',
    "camaraderie" INTEGER DEFAULT 50,
    "years_on_team" INTEGER DEFAULT 0,
    "is_marketplace" BOOLEAN DEFAULT false,
    "marketplace_price" INTEGER,
    "marketplace_end_time" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "total_games_played" INTEGER DEFAULT 0,
    "total_scores" INTEGER DEFAULT 0,
    "total_passing_attempts" INTEGER DEFAULT 0,
    "total_passes_completed" INTEGER DEFAULT 0,
    "total_passing_yards" INTEGER DEFAULT 0,
    "total_rushing_yards" INTEGER DEFAULT 0,
    "total_catches" INTEGER DEFAULT 0,
    "total_receiving_yards" INTEGER DEFAULT 0,
    "total_drops" INTEGER DEFAULT 0,
    "total_fumbles_lost" INTEGER DEFAULT 0,
    "total_tackles" INTEGER DEFAULT 0,
    "total_knockdowns_inflicted" INTEGER DEFAULT 0,
    "total_interceptions_caught" INTEGER DEFAULT 0,
    "total_passes_defended" INTEGER DEFAULT 0,
    "overall_potential_stars" DECIMAL(2,1),
    "career_injuries" INTEGER DEFAULT 0,
    "games_played_last_season" INTEGER DEFAULT 0,
    "daily_stamina_level" INTEGER DEFAULT 100,
    "in_game_stamina" INTEGER DEFAULT 100,
    "injury_status" VARCHAR(50) DEFAULT 'Healthy',
    "injury_recovery_points_current" INTEGER DEFAULT 0,
    "injury_recovery_points_needed" INTEGER DEFAULT 0,
    "daily_items_used" INTEGER DEFAULT 0,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_awards" (
    "id" TEXT NOT NULL,
    "player_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "season_id" VARCHAR,
    "award_type" TEXT NOT NULL,
    "award_category" TEXT NOT NULL,
    "stat_value" REAL,
    "award_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "year" INTEGER NOT NULL,
    "status" VARCHAR(50) DEFAULT 'active',
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "playoff_start_date" TIMESTAMP(6),
    "champion_team_id" VARCHAR(255),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "start_date_original" TIMESTAMP(6),

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "role_requirement" VARCHAR(50),
    "race_requirement" VARCHAR(50),
    "tier1_effect" TEXT NOT NULL,
    "tier2_effect" TEXT NOT NULL,
    "tier3_effect" TEXT NOT NULL,
    "tier4_effect" TEXT NOT NULL,
    "tier1_stat_bonus" JSONB,
    "tier2_stat_bonus" JSONB,
    "tier3_stat_bonus" JSONB,
    "tier4_stat_bonus" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stadium_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stadium_id" UUID NOT NULL,
    "event_type" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "revenue" INTEGER DEFAULT 0,
    "cost" INTEGER DEFAULT 0,
    "attendees" INTEGER DEFAULT 0,
    "event_date" TIMESTAMP(6) NOT NULL,
    "duration" INTEGER DEFAULT 1,
    "status" VARCHAR DEFAULT 'scheduled',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stadium_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stadium_revenue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "stadium_id" UUID NOT NULL,
    "match_id" UUID,
    "is_home_game" BOOLEAN NOT NULL,
    "attendance" INTEGER DEFAULT 0,
    "attendance_rate" REAL DEFAULT 0.35,
    "intimidation_factor" REAL DEFAULT 0,
    "ticket_sales" INTEGER DEFAULT 0,
    "concession_sales" INTEGER DEFAULT 0,
    "parking_revenue" INTEGER DEFAULT 0,
    "apparel_sales" INTEGER DEFAULT 0,
    "vip_suite_revenue" INTEGER DEFAULT 0,
    "atmosphere_bonus" INTEGER DEFAULT 0,
    "total_revenue" INTEGER DEFAULT 0,
    "maintenance_cost" INTEGER DEFAULT 0,
    "event_costs" INTEGER DEFAULT 0,
    "game_date" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "season" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stadium_revenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stadiums" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "name" VARCHAR NOT NULL,
    "level" INTEGER DEFAULT 1,
    "capacity" INTEGER DEFAULT 15000,
    "fan_loyalty" INTEGER DEFAULT 50,
    "field_size" VARCHAR(20) DEFAULT 'standard',
    "surface" VARCHAR(20) DEFAULT 'grass',
    "lighting" VARCHAR(20) DEFAULT 'basic',
    "concessions_level" INTEGER DEFAULT 1,
    "parking_level" INTEGER DEFAULT 1,
    "merchandising_level" INTEGER DEFAULT 1,
    "vip_suites_level" INTEGER DEFAULT 0,
    "screens_level" INTEGER DEFAULT 1,
    "lighting_level" INTEGER DEFAULT 1,
    "security_level" INTEGER DEFAULT 1,
    "home_advantage" INTEGER DEFAULT 5,
    "revenue_multiplier" INTEGER DEFAULT 100,
    "maintenance_cost" INTEGER DEFAULT 5000,
    "weather_resistance" INTEGER DEFAULT 50,
    "last_season_record" VARCHAR DEFAULT '0-0-0',
    "total_attendance" INTEGER DEFAULT 0,
    "total_revenue" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "last_three_games_record" VARCHAR DEFAULT '0-0-0',
    "current_win_streak" INTEGER DEFAULT 0,

    CONSTRAINT "stadiums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "type" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "level" INTEGER DEFAULT 1,
    "salary" INTEGER NOT NULL,
    "offense_rating" INTEGER DEFAULT 0,
    "defense_rating" INTEGER DEFAULT 0,
    "physical_rating" INTEGER DEFAULT 0,
    "scouting_rating" INTEGER DEFAULT 0,
    "recruiting_rating" INTEGER DEFAULT 0,
    "recovery_rating" INTEGER DEFAULT 0,
    "coaching_rating" INTEGER DEFAULT 0,
    "abilities" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "position" VARCHAR(50),
    "tactics" INTEGER DEFAULT 20,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_awards" (
    "id" TEXT NOT NULL,
    "team_id" UUID NOT NULL,
    "season_id" VARCHAR,
    "award_type" TEXT NOT NULL,
    "award_category" TEXT NOT NULL,
    "stat_value" REAL,
    "award_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_finances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "season" INTEGER DEFAULT 1,
    "ticket_sales" INTEGER DEFAULT 0,
    "concession_sales" INTEGER DEFAULT 0,
    "jersey_sales" INTEGER DEFAULT 0,
    "sponsorships" INTEGER DEFAULT 0,
    "player_salaries" INTEGER DEFAULT 0,
    "staff_salaries" INTEGER DEFAULT 0,
    "facilities" INTEGER DEFAULT 0,
    "credits" INTEGER DEFAULT 50000,
    "total_income" INTEGER DEFAULT 0,
    "total_expenses" INTEGER DEFAULT 0,
    "net_income" INTEGER DEFAULT 0,
    "premium_currency" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_finances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_inventory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "item_id" UUID,
    "item_type" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "description" TEXT,
    "rarity" VARCHAR,
    "metadata" JSONB DEFAULT '{}',
    "quantity" INTEGER DEFAULT 1,
    "acquired_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_match_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "total_offensive_yards" INTEGER DEFAULT 0,
    "passing_yards" INTEGER DEFAULT 0,
    "rushing_yards" INTEGER DEFAULT 0,
    "time_of_possession_seconds" INTEGER DEFAULT 0,
    "turnovers" INTEGER DEFAULT 0,
    "total_knockdowns_inflicted" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_match_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_season_history" (
    "id" TEXT NOT NULL,
    "team_id" UUID NOT NULL,
    "season_id" VARCHAR,
    "season_number" INTEGER NOT NULL,
    "division_id" TEXT NOT NULL,
    "final_position" INTEGER,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "goals_for" INTEGER NOT NULL DEFAULT 0,
    "goals_against" INTEGER NOT NULL DEFAULT 0,
    "playoff_result" TEXT,
    "special_achievements" TEXT[],
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_season_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "division" INTEGER DEFAULT 8,
    "wins" INTEGER DEFAULT 0,
    "losses" INTEGER DEFAULT 0,
    "draws" INTEGER DEFAULT 0,
    "points" INTEGER DEFAULT 0,
    "team_power" INTEGER DEFAULT 0,
    "team_camaraderie" INTEGER DEFAULT 50,
    "championships_won" INTEGER DEFAULT 0,
    "credits" INTEGER DEFAULT 15000,
    "exhibition_credits" INTEGER DEFAULT 3,
    "last_activity_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "is_paid_user" BOOLEAN DEFAULT false,
    "seasons_inactive" INTEGER DEFAULT 0,
    "formation" TEXT,
    "substitution_order" TEXT,
    "cumulative_team_ad_watch_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "field_size" VARCHAR(20) DEFAULT 'standard',
    "tactical_focus" VARCHAR(20) DEFAULT 'balanced',
    "gems" INTEGER DEFAULT 0,
    "fan_loyalty" INTEGER DEFAULT 50,
    "camaraderie" INTEGER DEFAULT 50,
    "subdivision" VARCHAR(50) DEFAULT 'main',

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tournament_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "entry_time" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "placement" INTEGER,
    "prize_won" INTEGER DEFAULT 0,
    "credits_won" INTEGER DEFAULT 0,
    "gems_won" INTEGER DEFAULT 0,
    "eliminated" BOOLEAN DEFAULT false,
    "eliminated_in_round" VARCHAR,
    "trophy_won" VARCHAR,
    "matches_played" INTEGER DEFAULT 0,

    CONSTRAINT "tournament_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR NOT NULL,
    "division" INTEGER NOT NULL,
    "entry_fee" INTEGER NOT NULL,
    "max_teams" INTEGER DEFAULT 8,
    "status" VARCHAR DEFAULT 'open',
    "prizes" JSONB DEFAULT '{}',
    "start_time" TIMESTAMP(6),
    "end_time" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "type" VARCHAR NOT NULL DEFAULT 'daily_divisional_cup',
    "season" INTEGER NOT NULL DEFAULT 0,
    "game_day" INTEGER,
    "entry_fee_credits" INTEGER DEFAULT 0,
    "entry_fee_gems" INTEGER DEFAULT 0,
    "requires_entry_item" BOOLEAN DEFAULT false,
    "registration_deadline" TIMESTAMP(6),
    "tournament_start_time" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR NOT NULL,
    "email" VARCHAR,
    "first_name" VARCHAR,
    "last_name" VARCHAR,
    "profile_image_url" VARCHAR,
    "credits" INTEGER DEFAULT 10000,
    "stripe_customer_id" VARCHAR,
    "daily_ad_watch_count" INTEGER DEFAULT 0,
    "last_ad_watch_date" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "role" VARCHAR(20) DEFAULT 'user',
    "total_ad_watch_count" INTEGER DEFAULT 0,
    "premium_reward_progress" INTEGER DEFAULT 0,
    "replit_id" VARCHAR,
    "claims" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "idx_matches_status" ON "matches"("status");

-- CreateIndex
CREATE INDEX "idx_notifications_user_id" ON "notifications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_stripe_payment_intent_id_key" ON "payment_transactions"("stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_skills_player_id_skill_id_key" ON "player_skills"("player_id", "skill_id");

-- CreateIndex
CREATE INDEX "idx_players_team_id" ON "players"("team_id");

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "sessions"("expire");

-- CreateIndex
CREATE UNIQUE INDEX "stadiums_team_id_key" ON "stadiums"("team_id");

-- CreateIndex
CREATE INDEX "idx_teams_division" ON "teams"("division");

-- CreateIndex
CREATE INDEX "idx_teams_user_id" ON "teams"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- AddForeignKey
ALTER TABLE "ad_views" ADD CONSTRAINT "ad_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "player_auctions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_bidder_id_fkey" FOREIGN KEY ("bidder_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exhibition_games" ADD CONSTRAINT "exhibition_games_opponent_team_id_fkey" FOREIGN KEY ("opponent_team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exhibition_games" ADD CONSTRAINT "exhibition_games_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "facility_upgrades" ADD CONSTRAINT "facility_upgrades_stadium_id_fkey" FOREIGN KEY ("stadium_id") REFERENCES "stadiums"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "league_standings" ADD CONSTRAINT "league_standings_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "league_standings" ADD CONSTRAINT "league_standings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "marketplace_bids" ADD CONSTRAINT "marketplace_bids_bidder_team_id_fkey" FOREIGN KEY ("bidder_team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "marketplace_bids" ADD CONSTRAINT "marketplace_bids_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "marketplace_escrow" ADD CONSTRAINT "marketplace_escrow_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "marketplace_escrow" ADD CONSTRAINT "marketplace_escrow_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_current_high_bidder_team_id_fkey" FOREIGN KEY ("current_high_bidder_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_seller_team_id_fkey" FOREIGN KEY ("seller_team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_consumables" ADD CONSTRAINT "match_consumables_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_consumables" ADD CONSTRAINT "match_consumables_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mvp_awards" ADD CONSTRAINT "mvp_awards_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mvp_awards" ADD CONSTRAINT "mvp_awards_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mvp_awards" ADD CONSTRAINT "mvp_awards_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mvp_awards" ADD CONSTRAINT "mvp_awards_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_auctions" ADD CONSTRAINT "player_auctions_highest_bidder_id_fkey" FOREIGN KEY ("highest_bidder_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_auctions" ADD CONSTRAINT "player_auctions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_auctions" ADD CONSTRAINT "player_auctions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_development_history" ADD CONSTRAINT "player_development_history_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_injuries" ADD CONSTRAINT "player_injuries_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_match_stats" ADD CONSTRAINT "player_match_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_skills" ADD CONSTRAINT "player_skills_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_skills" ADD CONSTRAINT "player_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "season_awards" ADD CONSTRAINT "season_awards_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "season_awards" ADD CONSTRAINT "season_awards_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "season_awards" ADD CONSTRAINT "season_awards_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stadium_events" ADD CONSTRAINT "stadium_events_stadium_id_fkey" FOREIGN KEY ("stadium_id") REFERENCES "stadiums"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stadium_revenue" ADD CONSTRAINT "stadium_revenue_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stadium_revenue" ADD CONSTRAINT "stadium_revenue_stadium_id_fkey" FOREIGN KEY ("stadium_id") REFERENCES "stadiums"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stadium_revenue" ADD CONSTRAINT "stadium_revenue_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stadiums" ADD CONSTRAINT "stadiums_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_awards" ADD CONSTRAINT "team_awards_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_awards" ADD CONSTRAINT "team_awards_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_finances" ADD CONSTRAINT "team_finances_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_inventory" ADD CONSTRAINT "team_inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_inventory" ADD CONSTRAINT "team_inventory_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_match_stats" ADD CONSTRAINT "team_match_stats_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_match_stats" ADD CONSTRAINT "team_match_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_season_history" ADD CONSTRAINT "team_season_history_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_season_history" ADD CONSTRAINT "team_season_history_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

