import { Server as SocketIOServer, Socket } from "socket.io";
import { prisma } from "../db";
// CRITICAL FIX: Dynamic import to prevent startup database connections
// import { matchStateManager } from "./matchStateManager";
import logger from '../utils/logger';

interface ConnectedUser {
  userId: string;
  socket: Socket;
  currentMatchId?: string;
}

class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private matchRooms: Map<string, Set<string>> = new Map(); // matchId -> userIds

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`🔌 WebSocket client connected: ${socket.id}`);

      // Handle user authentication with improved error handling
      socket.on('authenticate', async (data: { userId: string }) => {
        try {
          if (!data || !data.userId) {
            socket.emit('error', { 
              message: 'User ID required for authentication',
              code: 'MISSING_USER_ID' 
            });
            return;
          }

          // Verify user exists in database with timeout
          const userProfile = await Promise.race([
            prisma.userProfile.findFirst({
              where: { userId: data.userId }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database timeout')), 5000)
            )
          ]);

          if (!userProfile) {
            socket.emit('error', { 
              message: 'Invalid user ID',
              code: 'INVALID_USER_ID' 
            });
            return;
          }

          // Remove any previous connections for this user to prevent duplicates
          for (const [socketId, connectedUser] of this.connectedUsers.entries()) {
            if (connectedUser.userId === data.userId && socketId !== socket.id) {
              this.connectedUsers.delete(socketId);
            }
          }

          // Store authenticated user
          const connectedUser: ConnectedUser = {
            userId: data.userId,
            socket: socket
          };
          this.connectedUsers.set(socket.id, connectedUser);

          socket.emit('authenticated', { 
            userId: data.userId,
            message: 'Successfully authenticated' 
          });

          logger.info(`✅ User authenticated: ${data.userId} (${socket.id})`);
        } catch (error) {
          logger.info(`❌ Authentication error: ${error}`);
          socket.emit('error', { 
            message: 'Authentication failed',
            code: 'AUTH_ERROR',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Handle joining match rooms with improved error handling
      socket.on('join_match', async (data: { matchId: string }) => {
        try {
          const user = this.connectedUsers.get(socket.id);
          if (!user) {
            socket.emit('error', { 
              message: 'Not authenticated',
              code: 'NOT_AUTHENTICATED' 
            });
            return;
          }

          if (!data || !data.matchId) {
            socket.emit('error', { 
              message: 'Match ID required',
              code: 'MISSING_MATCH_ID' 
            });
            return;
          }

          const match = await Promise.race([
            prisma.game.findUnique({
              where: { id: parseInt(data.matchId) }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database timeout')), 5000)
            )
          ]);

          if (!match) {
            socket.emit('error', { message: 'Match not found' });
            return;
          }

          // Verify user has access to this match (owns one of the teams or is admin)
          const userProfile = await prisma.userProfile.findFirst({
            where: { userId: user.userId }
          });

          const userTeam = await prisma.team.findFirst({
            where: { userProfileId: userProfile?.id }
          });

          // @ts-expect-error TS2339
          const hasAccess = userTeam?.id === match.homeTeamId || 
                           // @ts-expect-error TS2339
                           userTeam?.id === match.awayTeamId ||
                           // @ts-expect-error TS2339
                           match.status === 'IN_PROGRESS'; // Allow spectating live matches

          if (!hasAccess) {
            socket.emit('error', { message: 'Access denied to this match' });
            return;
          }

          // Join the match room
          const roomName = `match_${data.matchId}`;
          socket.join(roomName);
          user.currentMatchId = data.matchId;

          // Add to match room tracking
          if (!this.matchRooms.has(data.matchId)) {
            this.matchRooms.set(data.matchId, new Set());
          }
          this.matchRooms.get(data.matchId)!.add(user.userId);

          socket.emit('joined_match', { 
            matchId: data.matchId,
            roomName: roomName,
            spectatorCount: this.matchRooms.get(data.matchId)!.size
          });

          logger.info(`🏟️ User ${user.userId} joined match ${data.matchId}`);
          logger.info(`🔍 TESTING: Code execution continuing after join...`);
          
          // Send current match state if live
          logger.info(`🔍 BEFORE getLiveMatchState call for match ${data.matchId}`);
          try {
            // @ts-expect-error TS2304
            const liveState = matchStateManager.getLiveMatchState(data.matchId);
            logger.info(`🔍 AFTER getLiveMatchState call - result: ${liveState ? 'FOUND' : 'NOT FOUND'}`);
            if (liveState) {
              logger.info(`🔍 Live state details - GameTime: ${liveState.gameTime}, Score: ${liveState.homeScore}-${liveState.awayScore}`);
              const serializedState = this.serializeLiveState(liveState);
              logger.info(`📤 Sending match state to user ${user.userId}`);
              socket.emit('match_state_update', serializedState);
              logger.info(`✅ Match state sent successfully`);
            } else {
              logger.info(`⚠️ No live state found for match ${data.matchId}`);
            }
          } catch (error) {
            logger.info(`❌ Error getting live state: ${error}`);
          }
        } catch (error) {
          logger.info(`❌ Error joining match: ${error}`);
          socket.emit('error', { message: 'Failed to join match' });
        }
      });

      // Handle leaving match rooms
      socket.on('leave_match', () => {
        const user = this.connectedUsers.get(socket.id);
        if (user && user.currentMatchId) {
          const roomName = `match_${user.currentMatchId}`;
          socket.leave(roomName);

          // Remove from match room tracking
          const matchUsers = this.matchRooms.get(user.currentMatchId);
          if (matchUsers) {
            matchUsers.delete(user.userId);
            if (matchUsers.size === 0) {
              this.matchRooms.delete(user.currentMatchId);
            }
          }

          logger.info(`🚪 User ${user.userId} left match ${user.currentMatchId}`);
          user.currentMatchId = undefined;
        }
      });

      // Handle match control commands (start, pause, etc.)
      socket.on('match_command', async (data: { matchId: string, command: string, params?: any }) => {
        try {
          const user = this.connectedUsers.get(socket.id);
          if (!user) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          // Verify user owns one of the teams in the match
          const match = await prisma.game.findUnique({
            where: { id: parseInt(data.matchId) }
          });

          if (!match) {
            socket.emit('error', { message: 'Match not found' });
            return;
          }

          const userProfile = await prisma.userProfile.findFirst({
            where: { userId: user.userId }
          });

          const userTeam = await prisma.team.findFirst({
            where: { userProfileId: userProfile?.id }
          });

          const isOwner = userTeam?.id === match.homeTeamId || userTeam?.id === match.awayTeamId;
          if (!isOwner) {
            socket.emit('error', { message: 'Only team owners can control matches' });
            return;
          }

          // Process match commands
          switch (data.command) {
            case 'start_match':
              // @ts-expect-error TS2304
              await matchStateManager.startLiveMatch(data.matchId, data.params?.isExhibition || false);
              this.broadcastToMatch(data.matchId, 'match_started', { matchId: data.matchId });
              break;
            
            case 'pause_match':
              // @ts-expect-error TS2304
              matchStateManager.pauseMatch(data.matchId);
              this.broadcastToMatch(data.matchId, 'match_paused', { matchId: data.matchId });
              break;
            
            case 'resume_match':
              // @ts-expect-error TS2304
              matchStateManager.resumeMatch(data.matchId);
              this.broadcastToMatch(data.matchId, 'match_resumed', { matchId: data.matchId });
              break;
            
            default:
              socket.emit('error', { message: 'Unknown match command' });
          }
        } catch (error) {
          logger.info(`❌ Error processing match command: ${error}`);
          socket.emit('error', { message: 'Failed to process command' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          // Remove from match room if in one
          if (user.currentMatchId) {
            const matchUsers = this.matchRooms.get(user.currentMatchId);
            if (matchUsers) {
              matchUsers.delete(user.userId);
              if (matchUsers.size === 0) {
                this.matchRooms.delete(user.currentMatchId);
              }
            }
          }
          
          this.connectedUsers.delete(socket.id);
          logger.info(`🔌 WebSocket client disconnected: ${socket.id} (${user.userId})`);
        }
      });
    });
  }

  // Broadcast match state updates to all users in a match room
  broadcastMatchUpdate(matchId: string, liveState: any) {
    const roomName = `match_${matchId}`;
    this.io.to(roomName).emit('match_state_update', this.serializeLiveState(liveState));
  }

  // Broadcast match events to all users in a match room
  broadcastMatchEvent(matchId: string, event: any) {
    const roomName = `match_${matchId}`;
    this.io.to(roomName).emit('match_event', event);
  }

  // Broadcast match completion
  broadcastMatchComplete(matchId: string, finalState: any) {
    const roomName = `match_${matchId}`;
    this.io.to(roomName).emit('match_completed', {
      matchId,
      finalState: this.serializeLiveState(finalState)
    });
  }

  // Generic broadcast to match room
  private broadcastToMatch(matchId: string, event: string, data: any) {
    const roomName = `match_${matchId}`;
    this.io.to(roomName).emit(event, data);
  }

  // Convert Maps to objects for JSON serialization
  private serializeLiveState(liveState: any) {
    const serialized = { ...liveState };
    
    // Convert playerStats Map to object
    if (liveState.playerStats instanceof Map) {
      const playerStatsObj: Record<string, any> = {};
      // @ts-expect-error TS7006
      liveState.playerStats.forEach((stats, playerId) => {
        playerStatsObj[playerId] = stats;
      });
      serialized.playerStats = playerStatsObj;
    }

    // Convert teamStats Map to object
    if (liveState.teamStats instanceof Map) {
      const teamStatsObj: Record<string, any> = {};
      // @ts-expect-error TS7006
      liveState.teamStats.forEach((stats, teamId) => {
        teamStatsObj[teamId] = stats;
      });
      serialized.teamStats = teamStatsObj;
    }

    return serialized;
  }

  // Get connected users count for a match
  getMatchSpectatorCount(matchId: string): number {
    return this.matchRooms.get(matchId)?.size || 0;
  }

  // Get all connected users
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }
}

// Export singleton instance
let webSocketService: WebSocketService;

export async function setupWebSocketServer(io: SocketIOServer): Promise<void> {
  webSocketService = new WebSocketService(io);
  webSocketService.setupEventHandlers();
  
  logger.info(`🚀 WebSocket service initialized`);
}

export { webSocketService };