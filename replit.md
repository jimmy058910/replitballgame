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