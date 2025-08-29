/**
 * Server-side WebSocket Manager for Real-Time Match Communication
 * Handles WebSocket connections, room management, and message broadcasting
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { LiveMatchState, MatchEvent, MatchCommand } from '../../shared/types/LiveMatchState.js';

interface ConnectedClient {
  id: string;
  userId: string;
  socket: WebSocket;
  matchId?: string;
  lastHeartbeat: number;
}

export class ServerWebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, ConnectedClient>();
  private matchRooms = new Map<string, Set<string>>(); // matchId -> set of client IDs
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeatCheck();
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
      this.handleConnection(socket, request);
    });

    console.log('WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: WebSocket, request: IncomingMessage) {
    const clientId = this.generateClientId();
    const client: ConnectedClient = {
      id: clientId,
      userId: '',
      socket,
      lastHeartbeat: Date.now()
    };

    this.clients.set(clientId, client);
    console.log(`WebSocket client connected: ${clientId}`);

    socket.on('message', (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    socket.on('close', () => {
      this.handleDisconnection(clientId);
    });

    socket.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connected',
      clientId: clientId
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(clientId: string, data: Buffer) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message = JSON.parse(data.toString());
      client.lastHeartbeat = Date.now();

      switch (message.type) {
        case 'authenticate':
          this.handleAuthenticate(clientId, message.userId);
          break;

        case 'joinMatch':
          this.handleJoinMatch(clientId, message.matchId);
          break;

        case 'leaveMatch':
          this.handleLeaveMatch(clientId, message.matchId);
          break;

        case 'matchCommand':
          this.handleMatchCommand(clientId, message.command);
          break;

        case 'requestSync':
          this.handleRequestSync(clientId, message.matchId);
          break;

        case 'ping':
          this.sendToClient(clientId, { type: 'pong' });
          break;

        case 'subscribeEvents':
          this.handleSubscribeEvents(clientId, message.eventTypes);
          break;

        case 'unsubscribeEvents':
          this.handleUnsubscribeEvents(clientId, message.eventTypes);
          break;

        case 'customMessage':
          this.handleCustomMessage(clientId, message);
          break;

        default:
          console.warn(`Unknown message type from client ${clientId}:`, message.type);
      }
    } catch (error) {
      console.error(`Error parsing message from client ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        error: 'Invalid message format'
      });
    }
  }

  /**
   * Handle client authentication
   */
  private handleAuthenticate(clientId: string, userId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.userId = userId;
    console.log(`Client ${clientId} authenticated as user ${userId}`);

    this.sendToClient(clientId, {
      type: 'authenticated',
      userId: userId
    });
  }

  /**
   * Handle client joining a match
   */
  private handleJoinMatch(clientId: string, matchId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Leave current match if any
    if (client.matchId) {
      this.handleLeaveMatch(clientId, client.matchId);
    }

    // Join new match
    client.matchId = matchId;
    
    if (!this.matchRooms.has(matchId)) {
      this.matchRooms.set(matchId, new Set());
    }
    
    this.matchRooms.get(matchId)!.add(clientId);
    
    console.log(`Client ${clientId} joined match ${matchId}`);
    
    this.sendToClient(clientId, {
      type: 'joinedMatch',
      matchId: matchId
    });

    // Notify other clients in the match
    this.broadcastToMatch(matchId, 'userJoined', {
      userId: client.userId
    }, [clientId]);
  }

  /**
   * Handle client leaving a match
   */
  private handleLeaveMatch(clientId: string, matchId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const matchRoom = this.matchRooms.get(matchId);
    if (matchRoom) {
      matchRoom.delete(clientId);
      
      if (matchRoom.size === 0) {
        this.matchRooms.delete(matchId);
      }
    }

    client.matchId = undefined;
    
    console.log(`Client ${clientId} left match ${matchId}`);

    // Notify other clients in the match
    if (matchRoom && matchRoom.size > 0) {
      this.broadcastToMatch(matchId, 'userLeft', {
        userId: client.userId
      });
    }
  }

  /**
   * Handle match command from client
   */
  private handleMatchCommand(clientId: string, command: MatchCommand) {
    const client = this.clients.get(clientId);
    if (!client || !client.matchId) return;

    console.log(`Match command from client ${clientId}:`, command);

    // Forward command to live match engine
    // This would integrate with the LiveMatchEngine
    // liveMatchEngine.handleCommand(command);

    // Broadcast command to other clients in match
    this.broadcastToMatch(client.matchId, 'matchCommand', command, [clientId]);
  }

  /**
   * Handle request for match state sync
   */
  private handleRequestSync(clientId: string, matchId: string) {
    console.log(`State sync requested by client ${clientId} for match ${matchId}`);
    
    // This would fetch current match state and send it to client
    // const currentState = liveMatchEngine.getMatchState(matchId);
    // if (currentState) {
    //   this.sendToClient(clientId, {
    //     type: 'matchUpdate',
    //     data: currentState
    //   });
    // }
  }

  /**
   * Handle event subscription
   */
  private handleSubscribeEvents(clientId: string, eventTypes: string[]) {
    console.log(`Client ${clientId} subscribed to events:`, eventTypes);
    // Store subscription preferences for client
  }

  /**
   * Handle event unsubscription
   */
  private handleUnsubscribeEvents(clientId: string, eventTypes: string[]) {
    console.log(`Client ${clientId} unsubscribed from events:`, eventTypes);
    // Remove subscription preferences for client
  }

  /**
   * Handle custom message
   */
  private handleCustomMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client || !client.matchId) return;

    // Forward custom message to other clients in match
    this.broadcastToMatch(client.matchId, 'customMessage', {
      from: client.userId,
      messageType: message.messageType,
      data: message.data
    }, [clientId]);
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`Client ${clientId} disconnected`);

    // Leave match if joined
    if (client.matchId) {
      this.handleLeaveMatch(clientId, client.matchId);
    }

    // Remove client
    this.clients.delete(clientId);
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (client && client.socket.readyState === WebSocket.OPEN) {
      try {
        client.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
      }
    }
  }

  /**
   * Broadcast message to all clients in a match
   */
  broadcastToMatch(matchId: string, type: string, data: any, excludeClients: string[] = []) {
    const matchRoom = this.matchRooms.get(matchId);
    if (!matchRoom) return;

    const message = {
      type,
      data,
      matchId
    };

    matchRoom.forEach(clientId => {
      if (!excludeClients.includes(clientId)) {
        this.sendToClient(clientId, message);
      }
    });
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastToAll(type: string, data: any, excludeClients: string[] = []) {
    const message = { type, data };

    this.clients.forEach((client, clientId) => {
      if (!excludeClients.includes(clientId)) {
        this.sendToClient(clientId, message);
      }
    });
  }

  /**
   * Get clients in a specific match
   */
  getMatchClients(matchId: string): string[] {
    const matchRoom = this.matchRooms.get(matchId);
    return matchRoom ? Array.from(matchRoom) : [];
  }

  /**
   * Get client info
   */
  getClientInfo(clientId: string): ConnectedClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start heartbeat check to remove stale connections
   */
  private startHeartbeatCheck() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const staleThreshold = 60000; // 60 seconds

      this.clients.forEach((client, clientId) => {
        if (now - client.lastHeartbeat > staleThreshold) {
          console.log(`Removing stale client: ${clientId}`);
          this.handleDisconnection(clientId);
        }
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get server statistics
   */
  getStats(): {
    totalClients: number;
    activeMatches: number;
    clientsPerMatch: { [matchId: string]: number };
  } {
    const clientsPerMatch: { [matchId: string]: number } = {};
    
    this.matchRooms.forEach((clients, matchId) => {
      clientsPerMatch[matchId] = clients.size;
    });

    return {
      totalClients: this.clients.size,
      activeMatches: this.matchRooms.size,
      clientsPerMatch
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.clients.forEach((client, clientId) => {
      client.socket.close();
    });

    this.clients.clear();
    this.matchRooms.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}

// Export singleton instance
export const serverWebSocketManager = new ServerWebSocketManager();

// Create singleton instance
export const webSocketManager = new ServerWebSocketManager();