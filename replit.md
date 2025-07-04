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

### December 28, 2025
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