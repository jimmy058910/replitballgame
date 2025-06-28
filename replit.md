# Realm Rivalry - Fantasy Sports Management Game

## Overview
Realm Rivalry is an advanced fantasy sports management web application featuring tactical team management with 5 specific fantasy races (Human, Sylvan, Gryll, Lumina, Umbra), comprehensive league systems with division-based tournaments, exhibition matches, advanced 3-tier player abilities system, team inactivity tracking, enhanced marketplace with bidding system, live match simulation with comprehensive game animations, detailed injury and recovery mechanics, mobile-responsive design, and advanced stadium/facility management.

Built as a React + Express web application with PostgreSQL database, using modern UI components and real-time features.

## Project Architecture

### Frontend (React + Vite)
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React and React Icons

### Backend (Express + Node.js)
- **Server**: Express with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: PostgreSQL-backed sessions

### Key Features Implemented
- **Team Management**: Complete roster management with formation system
- **League System**: 8-division structure with integrated playoffs
- **Player System**: 5 fantasy races with role-based gameplay (Passer, Runner, Blocker)
- **Stadium Management**: Multi-level facility upgrades and revenue tracking
- **Marketplace**: Player trading with bidding system
- **Notifications**: Real-time notification system with deletion capability
- **Store System**: In-game purchases and premium currency
- **Contract Management**: Advanced contract negotiation system
- **Injury System**: Detailed injury tracking and recovery mechanics

## Recent Changes

### December 29, 2025 (League Standings System Enhanced + Fake Data Cleared)
- ✓ COMPREHENSIVE LEAGUE STANDINGS REDESIGNED: Updated both compact and full standings displays with all requested columns
- ✓ Fixed database schema mismatches - corrected field names from team1Id/team2Id to homeTeamId/awayTeamId in standings API
- ✓ Updated field references - now properly uses homeScore/awayScore instead of team1Score/team2Score for accurate calculations
- ✓ Enhanced standings display format: Win/Loss/Tie, Points, SF (Scores For), SA (Scores Against), DIFF (point differential), Streak
- ✓ Fixed TypeScript errors - added proper array type checking and null value handling in LeagueStandings component
- ✓ Updated calculateStreak function to use correct database field names for proper streak calculation
- ✓ Enhanced standings sorting logic with null value protection for comprehensive point calculations
- ✓ CRITICAL DATA CLEANUP: Removed 63 fake/test matches that were causing incorrect standings display (7 pts, T5 streak with no games played)
- ✓ Improved header layout - fixed spillover issues with better column sizing and responsive design
- ✓ Dashboard compact standings: Shows W/L/T, PTS, DIFF, and Streak without SF/SA to save space
- ✓ Competition League full standings: Shows all columns including SF and SA for comprehensive statistics
- ✓ All teams now properly display 0-0-0 records, 0 points, and "-" streaks when no games have been played
- ✓ CRITICAL CONTRACT MANAGEMENT FIX: Fixed API endpoint from `/api/players/team/${teamId}` to `/api/teams/${teamId}/players` - now shows all 11 players instead of only 8
- ✓ SERVER TIME FIXED: Resolved "Loading..." issue by properly importing ServerTimeDisplay component instead of broken inline implementation
- ✓ LEAGUE SCHEDULE RESTORED: Generated new season schedule after clearing fake data - league games now properly scheduled
- ✓ PURPLE GRADIENT HEADERS RESTORED: Added purple gradient seasonal cycle display to Competition page matching Dashboard design for visual consistency
- ✓ CONTRACT MANAGEMENT COMPLETE FIX: Added new "All Players" tab showing all 11 team players with contract status and ability to sign contracts for players without them
- ✓ SERVER TIME DISPLAY FIXED: Removed duplicate server time query from Dashboard that was causing "Unable to load server time" error - now uses proper ServerTimeDisplay component
- ✓ LEAGUE SCHEDULE GENERATION FIX: Fixed endpoint mismatch in SuperUser panel - generateScheduleMutation now calls correct `/api/superuser/generate-season-schedule` route instead of broken `/api/superuser/generate-schedule`
- ✓ CONTRACT SYSTEM SIMPLIFIED: Removed complex ContractManagement component with unwanted salary cap management and tabs - reverted to simple contract display showing all 11 players with negotiate buttons as requested
- ✓ CONTRACT NEGOTIATION UI FIXED: Fixed white-on-white text contrast in player response section by adding proper dark mode text colors
- ✓ CONTRACT CACHE INVALIDATION FIXED: Updated ContractNegotiation component to properly invalidate the correct query cache after successful contract updates so the contract list refreshes immediately
- ✓ CONTRACT NEGOTIATION LOGIC FIXED: Aligned success threshold with response generation - accepted offers now show accepting responses instead of mismatched demanding/considering messages  
- ✓ CONTRACT FINALIZATION API FIXED: Updated ContractNegotiation component to call correct `/api/players/:playerId/negotiate` endpoint instead of non-existent `/api/players/:playerId/contract` route
- ✓ CONTRACT AUTO-FINALIZATION ADDED: Fixed critical missing step where accepted contracts weren't being finalized - now automatically calls finalization when player accepts offer
- ✓ SIGNING BONUS DEDUCTION FIXED: Added missing financial transaction logic to contract negotiation endpoint - signing bonuses now properly deducted from team credits with immediate UI refresh

### December 29, 2025 (Earlier - Comprehensive Commentary System + Complete Stat Boost System)
- ✓ COMPREHENSIVE GAME COMMENTARY SYSTEM IMPLEMENTED: Created sophisticated 6-category commentary generator according to user specifications
- ✓ Created CommentaryGenerator class with 100+ unique commentary variations covering all game situations
- ✓ Category 1 - General Play & Game Flow: 35+ variations for advancing ball, midfield battles, defensive pressure, time urgency, low stamina
- ✓ Category 2 - Ball Carrier: 25+ variations for runners with high speed/agility/power, low stamina, passers forced to run
- ✓ Category 3 - Passing Game: 30+ variations for accurate/inaccurate passes, catches, drops, interceptions based on player stats
- ✓ Category 4 - Defense & Aggression: 30+ variations for brutal hits, tackles, injuries, fumbles, missed tackles with visceral descriptions
- ✓ Category 5 - Scoring & Post-Score Events: 10+ variations for scoring celebrations and post-score action
- ✓ Category 6 - Game States: Halftime reports and end-game summaries with MVP tracking and key victory factors
- ✓ Enhanced match simulation to use sophisticated commentary based on real-time game state and player statistics
- ✓ Commentary now contextually aware of time remaining, quarter, score, player stamina, and stat-based performance
- ✓ Replaced basic "Runner breaks through defense" with stat-based narratives like "Lightning-fast acceleration from Marcus as he breaks free!"
- ✓ COMPLETE STAT BOOST SYSTEM FINALIZED: Created full backend API, database tables, and React frontend component
- ✓ Implemented all 6 API endpoints for stat boost management (available, active, activate, cancel, apply, cleanup)
- ✓ Created StatBoostManager React component with beautiful UI, item selection dialogs, and comprehensive error handling
- ✓ Integrated StatBoostManager as new "Stat Boosts" tab in Team page for easy access to boost management
- ✓ All game mechanics working: 3-item limit enforcement, League Games only restriction, temporary stat modifications
- ✓ Enhanced live match viewing with dynamic, context-aware commentary that responds to game flow and player performance

### December 28, 2025 (Stadium System Fixed)
- ✓ CRITICAL FIX: Completely resolved stadium API routing and database schema issues
- ✓ Fixed Drizzle ORM schema mismatch - updated all stadium column names from snake_case to camelCase to match database
- ✓ Positioned stadium route correctly after authentication middleware setup to prevent crashes
- ✓ Stadium now displays proper data: 15,000 capacity, Level 2, 50% atmosphere, 10% revenue boost
- ✓ Enhanced facilities system showing all upgrade levels (Seating, Concessions, Parking, etc.)
- ✓ Added automatic stadium upgrade logic that improves existing stadiums with better defaults
- ✓ Fixed stadium data persistence and retrieval from PostgreSQL database
- ✓ Stadium upgrades system now functional with 3 available upgrade options
- ✓ Revenue calculation and match history display working correctly

### December 28, 2025 (Earlier)  
- ✓ UNIFIED DIVISION NAMING: Implemented consistent division tier system across all 8 divisions
- ✓ Created shared/divisions.ts utility with standardized naming (Diamond, Platinum, Gold, Silver, Bronze, Copper, Iron, Stone)
- ✓ Updated server routes and frontend components to use unified division system instead of inconsistent local naming
- ✓ Enhanced division information with tier descriptions, colors, and prestige levels for future features
- ✓ Fixed tournament naming consistency - all divisions now show proper tier names throughout application
- ✓ Consolidated duplicate getDivisionName functions across Tournaments, LeagueStandings, and SeasonChampionships components
- ✓ Enhanced division system to support future features like division-specific rewards and promotions

### December 28, 2025
- ✓ MAJOR STADIUM REVAMP: Completely rebuilt Stadium page with comprehensive management system
- ✓ Created new StadiumRevamped component with tabs for Upgrades, Match History, and Analytics
- ✓ Built comprehensive stadium API endpoint (/api/stadium/full) with revenue calculations and upgrade system
- ✓ Fixed finances display inconsistency - removed hardcoded $15,000 from Team Finances page
- ✓ Unified credit display symbols to use consistent ₡ across Stadium and Finances pages
- ✓ Added dynamic stadium upgrades: capacity expansion, facility improvements, field upgrades
- ✓ Implemented revenue tracking with match day income, concessions, parking, and VIP sales
- ✓ Created stadium analytics dashboard with revenue breakdowns and performance metrics
- ✓ Integrated stadium system with team finances for proper credit deduction on upgrades

### December 28, 2025 (Earlier)
- ✓ Fixed PlayerDetailModal crash errors by adding comprehensive null checks for player data
- ✓ Enhanced getPlayerRole function with default values to prevent null reference errors
- ✓ Fixed player race field display with proper fallback for null/undefined values
- ✓ Added proper error handling for age and other player fields that could be null
- ✓ Populated Store system with actual items replacing all placeholder content
- ✓ Enhanced Commerce page with Premium Items, Equipment, and Tournament Entries tabs
- ✓ Updated Tournament Entries to show only Exhibition Bonus Games and Tournament Entry
- ✓ Implemented dual currency support for entries (Credits OR Premium Gems)
- ✓ Added daily purchase limits (3 Exhibition games, 1 Tournament entry per day)
- ✓ Enhanced entry cards with dual pricing display and separate purchase buttons
- ✓ Fixed store API to provide comprehensive item catalogs with proper categorization
- ✓ Cleared redemption history mock data to show proper empty state
- ✓ Updated all store sections to display actual purchasable content instead of placeholders
- ✓ MAJOR: Implemented Dashboard player navigation - players are now clickable and show full PlayerDetailModal
- ✓ MAJOR: Completely overhauled exhibitions system - replaced Quick Match with "Instant Match" and "Choose Opponent"
- ✓ Added new exhibition API endpoints: instant-match, available-opponents, challenge-opponent
- ✓ Created opponent selection interface showing up to 8 teams from same division with stats and challenge buttons
- ✓ Enhanced exhibitions UI with dual-option system for better user experience
- ✓ CRITICAL FIX: Resolved PlayerDetailModal scouting system showing capped stats (26/26) instead of proper potential ranges
- ✓ Fixed ".toFixed is not a function" errors that crashed player details for certain players
- ✓ Implemented dynamic potential calculation system based on player age, current stats, and race characteristics
- ✓ Added race-based potential bonuses (Lumina and Sylvan races receive higher growth potential)
- ✓ Enhanced scouting to show varied potential ranges (e.g., 22/35, 26/31) unique to each player
- ✓ Added Generate Season Schedule functionality to SuperUser panel for creating league matches
- ✓ Updated season numbering to start from "Season 0" and increment by 1 each cycle
- ✓ Updated Competition Hub to match Dashboard's purple gradient seasonal cycle display design for visual consistency
- ✓ MAJOR FIX: Completely resolved league schedule system showing proper team names instead of random identifiers
- ✓ Fixed schedule generation to create exactly 4 games per League Day with perfect 15-minute intervals
- ✓ Enhanced daily schedule API to populate team names and provide clickable live viewing links
- ✓ Implemented proper round-robin scheduling algorithm distributing matches evenly across 14 regular season days

### December 25, 2025
- ✓ Fixed notification text visibility by adding proper contrast colors
- ✓ Added permanent notification deletion functionality 
- ✓ Removed Sponsorships page from navigation and routing
- ✓ Enhanced Dashboard with division standings display
- ✓ Improved player card statistics with color-coded role badges
- ✓ Fixed store purchase functionality using proper apiRequest format
- ✓ Enhanced auto formation system with better role validation and positioning
- ✓ Improved contract negotiation with more granular salary adjustment controls
- ✓ Updated TryoutSystem badge from "Offseason Only" to "Once per season"
- ✓ Cleaned up SocialIntegration component by removing placeholder follower counts
- ✓ Added proper capitalization for player roles and races in PlayerCard component
- ✓ Fixed Dashboard "My Team" tile to properly display player roster with compact mode
- ✓ Changed medium-range player stats (19-31) to display as white text for better readability
- ✓ Added enhanced error handling and debugging for Dashboard player data loading
- ✓ Fixed "Create Demo Notifications" functionality by replacing broken NotificationService calls with direct storage operations
- ✓ Fixed navigation links visibility by changing breakpoint from xl to lg
- ✓ Removed Auto Formation functionality entirely from TacticalFormation component
- ✓ Converted ContractNegotiation to popup dialog format with improved layout
- ✓ Fixed contract salary/years overlap by organizing controls in separate sections
- ✓ Added formation persistence - formations now save to database and reload properly
- ✓ Added Grant Test Credits functionality for Macomb Cougars testing
- ✓ Fixed "Fill my Division" by adding proper AI user creation before team creation
- ✓ Fixed Standings and League pages not showing teams by correcting API endpoint query format
- ✓ Added proper team sorting in standings by points, wins, and losses
- ✓ Removed Community Overview section from Social Integration Hub
- ✓ Removed Community and Engagement tabs from Social Integration Hub
- ✓ Created SuperUser page with admin controls for testing
- ✓ Moved notification and credit systems to SuperUser panel
- ✓ Fixed redundant Division standings on League page layout
- ✓ Added season reset and stop all games functionality to SuperUser panel
- ✓ Fixed live match speed - games now run 3 real minutes per half (6 minutes total)
- ✓ Improved match simulation timing for better user experience
- ✓ Fixed SuperUser "Stop All Games" functionality with proper database operations
- ✓ Added compact player roster cards to Dashboard layout
- ✓ Reorganized Dashboard layout with mini player cards for better space utilization
- ✓ Fixed Dashboard to display all team players instead of just 4
- ✓ Fixed SuperUser "Stop All Games" route implementation with proper error handling
- ✓ Enhanced season reset functionality to properly clear all team statistics
- ✓ Improved Dashboard player cards with better layout and detailed stats display
- ✓ Enhanced Dashboard player cards to 2-column layout with larger size and improved stat organization
- ✓ Modified Dashboard player cards to show Power rating in circle and display player's top 3 stats dynamically
- ✓ Fixed Dashboard power calculation to match Team page (sum of 5 core stats) and corrected name display
- ✓ Fixed Exhibitions feature by adding dynamic match route for exhibition match viewing
- ✓ Fixed exhibition match timer to start at 0:00 and progress properly (0:00-10:00 first half, 10:00-20:00 second half)
- ✓ Added proper team names display instead of "Team 1/Team 2" placeholders
- ✓ Updated player display to show actual player last names instead of generic P1, D1 labels
- ✓ Fixed missing opponent team names in exhibition matches
- ✓ Added fallback player display when simulation data is unavailable
- ✓ Updated field design to enclosed arena style with proper scoring zones (blue/red end zones)
- ✓ Enhanced player dots with name labels and better visual design
- ✓ Fixed player visibility issues by adding fallback displays and better positioning
- ✓ Improved field design with rounded corners and proper spacing around scoring zones
- ✓ Enhanced team name display logic with multiple fallback sources
- ✓ Removed generic "Home Team"/"Away Team" labels from display
- ✓ Changed exhibition quarter display to "First Half"/"Second Half" format
- ✓ Enhanced player name extraction to show actual last names from database
- ✓ Fixed exhibition routing - matches now navigate directly to MatchViewer
- ✓ Removed confusing "Live Simulation Demo" tab to streamline match viewing
- ✓ Added proper URL routing for individual matches (/match/:matchId)
- ✓ Fixed Grant Credits functionality to properly add credits instead of setting absolute values
- ✓ Added back visual scoring zones on field with blue/red end zones at 30% opacity
- ✓ Fixed player count to show 6 players per team instead of 5
- ✓ Updated displayName prioritization to show lastName first, then firstName
- ✓ Fixed Half display to show "First Half"/"Second Half" for exhibitions
- ✓ Fixed premium currency display in navigation to show correct values from team finances
- ✓ CRITICAL FIX: Resolved credit system display bug where credits appeared to have 15,000 minimum threshold
- ✓ Removed hardcoded fallback value (975,000) from finances API that was causing display inconsistency
- ✓ Credits now properly display actual values and can go below any threshold as intended
- ✓ Moved "Fill My Division" functionality from League page to SuperUser panel for admin controls
- ✓ Organized SuperUser panel with proper "League Management" section for testing controls
- ✓ Consolidated navigation by combining League/Tournaments/Exhibitions into "Competition" hub
- ✓ Combined Store and Marketplace into unified "Store" hub for streamlined navigation
- ✓ Reduced navigation items from 10 to 7 for improved mobile experience and cleaner interface
- ✓ Fixed routing for Competition and Store hub pages to resolve 404 errors
- ✓ Completely revamped Tactics tab to text-based interface removing all visual elements
- ✓ Created TextTacticalManager component with starter selection and substitution orders
- ✓ Implemented position-based tactical management (1 Passer, 2 Runners, 3 Blockers)
- ✓ Added "Reset to Optimal" functionality based on player power ratings
- ✓ Maintained API compatibility with existing formation storage system
- ✓ Fixed TryoutSystem API request format errors for both basic and premium tryouts
- ✓ Corrected apiRequest function calls to use proper parameter order (url, method, data)
- ✓ Fixed tryout candidate stat generation to keep stats in proper 1-40 range for young players
- ✓ Added exciting reveal animation system with progress bars and sequential candidate reveals
- ✓ Enhanced tryout experience with visual effects for high potential players and animated card entries
- ✓ Fixed race generation to use correct fantasy races (Human, Sylvan, Gryll, Lumina, Umbra) instead of generic races
- ✓ Enhanced candidate display with universal color-coded stats, power ratings, and proper stat symbols
- ✓ Removed subjective market value display and added proper accessibility descriptions
- ✓ MAJOR FIX: Completely rebuilt tactical formation system with correct 6-position requirements
- ✓ Fixed wildcard detection logic to properly show role assignments (1 Passer, 2 Runners, 2 Blockers + 1 Wildcard)
- ✓ Added comprehensive substitution order management with drag-and-drop functionality
- ✓ Enhanced tactical interface with position-specific controls and validation
- ✓ Added ability to reorder substitutes for each position type (Passer, Runner, Blocker)
- ✓ Implemented proper role labeling system that shows "Passer 1", "Runner 1/2", "Blocker 1/2", "Wildcard"
- ✓ Fixed relegation system to properly show Division 8 as floor division (no Division 9)
- ✓ Added manual server-wide day/season management controls to SuperUser panel
- ✓ Implemented "Advance Day" functionality to manually progress through 17-day seasonal cycle
- ✓ Added "Reset Season to Day 1" feature that resets all team statistics and stops active matches
- ✓ Enhanced seasonal cycle display on Dashboard and Competition pages with proper phase tracking
- ✓ Implemented Eastern Time (Detroit) server timezone system for league game scheduling
- ✓ Added 5PM-10PM Eastern scheduling window for optimal live viewing with staggered timing
- ✓ Created comprehensive timezone utility with scheduling functions and server time display
- ✓ Added ServerTimeDisplay component showing current Eastern time and league game window status
- ✓ Enhanced SuperUser panel with server time monitoring and scheduling information
- ✓ Implemented comprehensive taxi squad management system with backend API endpoints
- ✓ Created TaxiSquadManager component for viewing and managing recruited players
- ✓ Added "Taxi Squad" tab to Team page with 2-player capacity limit
- ✓ Updated TryoutSystem to properly send candidate data to backend for taxi squad storage
- ✓ Added promote/release functionality for taxi squad players with proper roster space validation

### Technical Improvements
- **Notification System**: Now uses solid background colors (red, blue, green, yellow) with white text for proper visibility
- **Auto Formation**: Enhanced with role requirements validation (1 passer, 2 runners, 2 blockers minimum)
- **Contract Negotiation**: Added fine-grained salary controls (+/-50, +/-100, +/-500, +/-1K)
- **Player Cards**: Stats color-coded (green for high 32+, red for low 18-, white for medium 19-31) with compact mode support
- **Store Purchases**: Fixed API request format for proper functionality
- **Dashboard**: Improved player tile with proper query format and error states

## User Preferences
- Focus on gameplay mechanics over visual polish
- Prefer comprehensive feature implementation
- Likes detailed statistics and analytics
- Values proper game balance and realistic simulation
- Wants mobile-responsive design
- Prefers dark theme UI
- **Mobile Strategy**: React Native conversion for native app store deployment
- **Monetization**: Interstitial ads (halftime) + Rewarded video ads for premium currency/rewards

## Database Schema
The application uses Drizzle ORM with PostgreSQL, featuring tables for:
- Users (Replit Auth integration)
- Teams (8-division league structure)  
- Players (with abilities, contracts, injuries)
- Matches (with detailed game simulation)
- Stadiums (with upgrade systems)
- Notifications (with deletion capability)
- Marketplace (with bidding system)
- Financial tracking

## Development Notes
- Uses TypeScript throughout for type safety
- Follows modern React patterns with hooks and functional components
- Implements real-time features with polling and WebSocket support
- Mobile-first responsive design approach
- Comprehensive error handling and user feedback