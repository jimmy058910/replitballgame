import { io, Socket } from "socket.io-client";

export interface MatchEvent {
  time: number;
  type: string;
  description: string;
  actingPlayerId?: string;
  targetPlayerId?: string;
  defensivePlayerId?: string;
  teamId?: string;
  data?: any;
}

export interface LiveMatchState {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  startTime: Date;
  gameTime: number;
  maxTime: number;
  currentHalf: 1 | 2;
  homeScore: number;
  awayScore: number;
  status: 'live' | 'completed' | 'paused';
  gameEvents: MatchEvent[];
  lastUpdateTime: Date;
  playerStats: Record<string, any>;
  teamStats: Record<string, any>;
  possessingTeamId: string | null;
  possessionStartTime: number;
}

export interface WebSocketCallbacks {
  onMatchUpdate?: (matchState: LiveMatchState) => void;
  onMatchEvent?: (event: MatchEvent) => void;
  onMatchComplete?: (data: { matchId: string; finalState: LiveMatchState }) => void;
  onMatchStarted?: (data: { matchId: string }) => void;
  onMatchPaused?: (data: { matchId: string }) => void;
  onMatchResumed?: (data: { matchId: string }) => void;
  onError?: (error: { message: string }) => void;
  onConnectionStatus?: (connected: boolean) => void;
  onSpectatorCountUpdate?: (count: number) => void;
}

class WebSocketManager {
  private socket: Socket | null = null;
  private currentMatchId: string | null = null;
  private callbacks: WebSocketCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeConnection();
  }

  private initializeConnection() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.socket = io(wsUrl, {
      path: '/ws',
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: this.maxReconnectAttempts,
      timeout: 10000
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      this.reconnectAttempts = 0;
      this.callbacks.onConnectionStatus?.(true);
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      this.callbacks.onConnectionStatus?.(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      this.callbacks.onConnectionStatus?.(false);
    });

    this.socket.on('authenticated', (data) => {
      console.log('✅ WebSocket authenticated:', data);
    });

    this.socket.on('joined_match', (data) => {
      console.log('🏟️ Joined match:', data);
      this.currentMatchId = data.matchId;
      this.callbacks.onSpectatorCountUpdate?.(data.spectatorCount || 0);
    });

    this.socket.on('match_state_update', (matchState: LiveMatchState) => {
      console.log('📊 Match state update received:', matchState);
      this.callbacks.onMatchUpdate?.(matchState);
    });

    this.socket.on('match_event', (event: MatchEvent) => {
      this.callbacks.onMatchEvent?.(event);
    });

    this.socket.on('match_completed', (data) => {
      this.callbacks.onMatchComplete?.(data);
    });

    this.socket.on('match_started', (data) => {
      this.callbacks.onMatchStarted?.(data);
    });

    this.socket.on('match_paused', (data) => {
      this.callbacks.onMatchPaused?.(data);
    });

    this.socket.on('match_resumed', (data) => {
      this.callbacks.onMatchResumed?.(data);
    });

    this.socket.on('error', (error) => {
      console.error('🔌 WebSocket error:', error);
      this.callbacks.onError?.(error);
    });
  }

  connect(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket not initialized'));
        return;
      }

      this.socket.connect();

      this.socket.once('connect', () => {
        this.socket!.emit('authenticate', { userId });
        
        this.socket!.once('authenticated', () => {
          resolve();
        });

        this.socket!.once('error', (error) => {
          reject(error);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          reject(new Error('Authentication timeout'));
        }, 10000);
      });

      this.socket.once('connect_error', (error) => {
        reject(error);
      });
    });
  }

  disconnect() {
    if (this.currentMatchId) {
      this.leaveMatch();
    }
    
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  joinMatch(matchId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.socket.emit('join_match', { matchId });

      this.socket.once('joined_match', (data) => {
        if (data.matchId === matchId) {
          resolve();
        }
      });

      this.socket.once('error', (error) => {
        reject(error);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Join match timeout'));
      }, 5000);
    });
  }

  leaveMatch() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_match');
      this.currentMatchId = null;
    }
  }

  startMatch(matchId: string, isExhibition: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.socket.emit('match_command', {
        matchId,
        command: 'start_match',
        params: { isExhibition }
      });

      this.socket.once('match_started', (data) => {
        if (data.matchId === matchId) {
          resolve();
        }
      });

      this.socket.once('error', (error) => {
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Start match timeout'));
      }, 10000);
    });
  }

  pauseMatch(matchId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.socket.emit('match_command', {
        matchId,
        command: 'pause_match'
      });

      this.socket.once('match_paused', (data) => {
        if (data.matchId === matchId) {
          resolve();
        }
      });

      this.socket.once('error', (error) => {
        reject(error);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Pause match timeout'));
      }, 5000);
    });
  }

  resumeMatch(matchId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.socket.emit('match_command', {
        matchId,
        command: 'resume_match'
      });

      this.socket.once('match_resumed', (data) => {
        if (data.matchId === matchId) {
          resolve();
        }
      });

      this.socket.once('error', (error) => {
        reject(error);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Resume match timeout'));
      }, 5000);
    });
  }

  setCallbacks(callbacks: WebSocketCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getCurrentMatchId(): string | null {
    return this.currentMatchId;
  }
}

// Export singleton instance
export const webSocketManager = new WebSocketManager();
export default webSocketManager;