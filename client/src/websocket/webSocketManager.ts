/**
 * WebSocket Manager for Real-Time Match Communication
 * Handles connection, authentication, and message routing for live matches
 */

import { LiveMatchState, MatchEvent, MatchCommand } from '../../../shared/types/LiveMatchState';

export interface WebSocketCallbacks {
  onMatchUpdate: (state: LiveMatchState) => void;
  onMatchEvent: (event: MatchEvent) => void;
  onConnectionStatus: (connected: boolean) => void;
  onError?: (error: string) => void;
}

class WebSocketManager {
  private socket: WebSocket | null = null;
  private userId: string | null = null;
  private currentMatchId: string | null = null;
  private callbacks: WebSocketCallbacks | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 2000; // 2 seconds
  private isConnecting: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize WebSocket manager
  }

  /**
   * Set callback functions for WebSocket events
   */
  setCallbacks(callbacks: WebSocketCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(userId: string): Promise<void> {
    if (this.isConnecting || (this.socket?.readyState === WebSocket.OPEN)) {
      return Promise.resolve();
    }

    this.isConnecting = true;
    this.userId = userId;

    return new Promise((resolve, reject) => {
      try {
        // Determine WebSocket URL
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
        
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // Authenticate with user ID
          this.send({
            type: 'authenticate',
            userId: this.userId
          });

          // Start heartbeat
          this.startHeartbeat();
          
          this.callbacks?.onConnectionStatus(true);
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.callbacks?.onConnectionStatus(false);
          
          if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
          }

          // Attempt to reconnect if not intentional close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.callbacks?.onError?.('WebSocket connection error');
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            this.socket?.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 second timeout

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId).catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // 30 second heartbeat
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data);
      console.log('🔍 [DEBUG] WebSocket message received:', message);
      
      switch (message.type) {
        case 'matchUpdate':
          console.log('🔍 [DEBUG] Processing match update:', message.data);
          if (this.callbacks?.onMatchUpdate) {
            this.callbacks.onMatchUpdate(message.data);
          }
          break;
          
        case 'matchEvent':
          console.log('🔍 [DEBUG] Processing match event:', message.data);
          if (this.callbacks?.onMatchEvent) {
            this.callbacks.onMatchEvent(message.data);
          }
          break;
          
        case 'error':
          console.error('🔍 [DEBUG] Server error:', message.error);
          this.callbacks?.onError?.(message.error);
          break;
          
        case 'pong':
          console.log('🔍 [DEBUG] Heartbeat pong received');
          break;
          
        case 'connected':
          console.log('🔍 [DEBUG] WebSocket connection confirmed');
          break;
          
        case 'authenticated':
          console.log('🔍 [DEBUG] WebSocket authenticated successfully');
          break;
          
        case 'joinedMatch':
          console.log('🔍 [DEBUG] Joined match successfully:', message.matchId);
          this.currentMatchId = message.matchId;
          break;
          
        default:
          console.warn('🔍 [DEBUG] Unknown message type:', message.type, message);
      }
    } catch (error) {
      console.error('🔍 [DEBUG] Error parsing WebSocket message:', error);
    }
  }

  /**
   * Send message to WebSocket server
   */
  private send(message: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }

  /**
   * Join a specific match room
   */
  async joinMatch(matchId: string): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('🔍 [DEBUG] Cannot join match - WebSocket not connected. ReadyState:', this.socket?.readyState);
      throw new Error('WebSocket not connected');
    }

    console.log('🔍 [DEBUG] Joining match:', matchId);
    this.send({
      type: 'joinMatch',
      matchId: matchId
    });

    this.currentMatchId = matchId;
  }

  /**
   * Leave the current match room
   */
  leaveMatch() {
    if (this.currentMatchId) {
      this.send({
        type: 'leaveMatch',
        matchId: this.currentMatchId
      });
      this.currentMatchId = null;
    }
  }

  /**
   * Send match command (pause, resume, scrub, etc.)
   */
  sendMatchCommand(command: MatchCommand) {
    if (!this.currentMatchId) {
      throw new Error('Not joined to any match');
    }

    this.send({
      type: 'matchCommand',
      command: command
    });
  }

  /**
   * Broadcast to all users in a match (server-side method)
   */
  broadcastToMatch(matchId: string, type: string, data: any) {
    // This would be called from server-side code
    // Included here for completeness of the interface
    const message = {
      type,
      data,
      matchId
    };
    
    // Server would implement the actual broadcasting logic
    console.log('Broadcasting to match:', matchId, message);
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.socket) return 'closed';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'open';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'closed';
      default:
        return 'closed';
    }
  }

  /**
   * Get current match ID
   */
  getCurrentMatchId(): string | null {
    return this.currentMatchId;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.currentMatchId) {
      this.leaveMatch();
    }

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.userId = null;
    this.currentMatchId = null;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * Request match state sync
   */
  requestStateSync() {
    if (this.currentMatchId) {
      this.send({
        type: 'requestSync',
        matchId: this.currentMatchId
      });
    }
  }

  /**
   * Subscribe to specific match events
   */
  subscribeToEvents(eventTypes: string[]) {
    this.send({
      type: 'subscribeEvents',
      eventTypes: eventTypes
    });
  }

  /**
   * Unsubscribe from match events
   */
  unsubscribeFromEvents(eventTypes: string[]) {
    this.send({
      type: 'unsubscribeEvents',
      eventTypes: eventTypes
    });
  }

  /**
   * Send custom message to match participants
   */
  sendCustomMessage(type: string, data: any) {
    if (this.currentMatchId) {
      this.send({
        type: 'customMessage',
        matchId: this.currentMatchId,
        messageType: type,
        data: data
      });
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    connectionState: string;
    reconnectAttempts: number;
    currentMatchId: string | null;
    userId: string | null;
  } {
    return {
      connectionState: this.getConnectionState(),
      reconnectAttempts: this.reconnectAttempts,
      currentMatchId: this.currentMatchId,
      userId: this.userId
    };
  }
}

// Create singleton instance
export const webSocketManager = new WebSocketManager();

// Export for testing or alternative usage
export { WebSocketManager };