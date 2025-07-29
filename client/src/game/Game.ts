import Player from './Player';
import Ball from './Ball';

interface GameData {
  homeTeam: any;
  awayTeam: any;
  liveState: any;
  events: any[];
  stadiumData?: any;
}

// Event Priority Classification System
const EVENT_PRIORITIES = {
  CRITICAL: { priority: 1, speed: 1.0 },    // Scores, injuries, major tackles
  IMPORTANT: { priority: 2, speed: 2.0 },   // Defensive plays, timely skills, successful passes in scoring position  
  STANDARD: { priority: 3, speed: 0 },      // Regular gameplay - STOP VISUALS
  DOWNTIME: { priority: 4, speed: 0 }       // Timeouts, positioning - STOP VISUALS
};

// Dynamic Speed Controller Class
class MatchSpeedController {
  public currentSpeed: number = 1.0;
  public isVisualsStopped: boolean = false;
  private textSummaryCallback?: (event: any) => void;

  constructor(textSummaryCallback?: (event: any) => void) {
    this.textSummaryCallback = textSummaryCallback;
  }
  
  calculateEventPriority(event: any) {
    // Critical moments (1x speed)
    if (['SCORE', 'INJURY', 'MAJOR_TACKLE', 'INTERCEPTION', 'SCORE_ATTEMPT'].includes(event.type?.toUpperCase())) {
      return EVENT_PRIORITIES.CRITICAL;
    }
    
    // Important events (2x speed) 
    if (['SUCCESSFUL_PASS_SCORING', 'DEFENSIVE_STOP', 'PASS_ATTEMPT', 'SCRUM'].includes(event.type?.toUpperCase())) {
      return EVENT_PRIORITIES.IMPORTANT;
    }
    
    // Standard play (stop visuals)
    if (['ROUTINE_PLAY', 'REGULAR_PASS', 'STANDARD_MOVEMENT'].includes(event.type?.toUpperCase())) {
      return EVENT_PRIORITIES.STANDARD;
    }
    
    // Downtime (stop visuals)
    return EVENT_PRIORITIES.DOWNTIME;
  }
  
  updateSpeed(currentEvent: any) {
    const priority = this.calculateEventPriority(currentEvent);
    
    // Stop visuals for Priority 3 & 4
    if (priority.priority >= 3) {
      this.stopVisuals();
      this.showTextSummary(currentEvent);
      return;
    }
    
    // Resume visuals and set speed for Priority 1 & 2
    this.resumeVisuals();
    this.setSpeed(priority.speed);
  }
  
  stopVisuals() {
    this.isVisualsStopped = true;
  }
  
  resumeVisuals() {
    this.isVisualsStopped = false;
  }
  
  setSpeed(speed: number) {
    this.currentSpeed = speed;
  }
  
  showTextSummary(event: any) {
    if (this.textSummaryCallback) {
      this.textSummaryCallback(event);
    }
  }
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private players: Player[] = [];
  private ball: Ball;
  private gameId: string;
  private isRunning: boolean = false;
  private animationId: number | null = null;
  private speedController: MatchSpeedController;
  private lastFrameTime: number = 0;
  private stadiumData: any = null;

  constructor(canvas: HTMLCanvasElement, gameId: string, textSummaryCallback?: (event: any) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gameId = gameId;
    this.ball = new Ball(this.canvas.width / 2, this.canvas.height / 2);
    this.speedController = new MatchSpeedController(textSummaryCallback);
    this.init();
  }

  private init() {
    // Initialize with placeholder players until real data arrives
    this.setupPlaceholderPlayers();
    
    // Start the game loop
    this.start();
  }

  private setupPlaceholderPlayers() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Home team (left side)
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const radius = 80;
      const x = centerX - 120 + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      this.players.push(new Player(
        x, y, 
        `Home ${i + 1}`, 
        25, 25, 25, 
        'Human', 
        '#3b82f6', // Blue
        i < 3 ? 'Passer' : i < 6 ? 'Runner' : 'Blocker'
      ));
    }
    
    // Away team (right side)
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const radius = 80;
      const x = centerX + 120 + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      this.players.push(new Player(
        x, y, 
        `Away ${i + 1}`, 
        25, 25, 25, 
        'Human', 
        '#ef4444', // Red
        i < 3 ? 'Passer' : i < 6 ? 'Runner' : 'Blocker'
      ));
    }
  }

  public updateGameData(gameData: GameData) {
    // Update players from real game data
    if (gameData.homeTeam?.players) {
      this.updateTeamPlayers(gameData.homeTeam.players, '#3b82f6', 0);
    }
    if (gameData.awayTeam?.players) {
      this.updateTeamPlayers(gameData.awayTeam.players, '#ef4444', 9);
    }

    // Update ball position from game events and process speed control
    if (gameData.events && gameData.events.length > 0) {
      const latestEvent = gameData.events[0];
      this.ball.updateFromEvent(latestEvent);
      
      // Process event through speed controller
      this.speedController.updateSpeed(latestEvent);
    }
    
    // Store stadium data for enhanced rendering
    if (gameData.stadiumData) {
      this.stadiumData = gameData.stadiumData;
    }

    // Update from live state
    if (gameData.liveState) {
      this.updateFromLiveState(gameData.liveState);
    }
  }

  private updateTeamPlayers(teamPlayers: any[], color: string, startIndex: number) {
    teamPlayers.forEach((playerData, index) => {
      const gamePlayerIndex = startIndex + index;
      if (gamePlayerIndex < this.players.length) {
        const player = this.players[gamePlayerIndex];
        player.updateFromGameData(playerData);
      }
    });
  }

  private updateFromLiveState(liveState: any) {
    // Update player positions based on field position or intensity
    const fieldIntensity = liveState.fieldPosition || 50;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Update ball position based on field intensity
    const ballX = centerX + (fieldIntensity - 50) * 2;
    this.ball.setPosition(ballX, centerY + (Math.random() - 0.5) * 40);
    
    // Animate players toward ball with some variation
    this.players.forEach((player, index) => {
      const ballPos = this.ball.getPosition();
      const playerPos = player.getPosition();
      const isHomeTeam = index < 9;
      
      // Create formation-based movement
      const targetX = ballPos.x + (isHomeTeam ? -60 : 60) + (Math.random() - 0.5) * 80;
      const targetY = ballPos.y + (Math.random() - 0.5) * 60;
      
      const dx = targetX - playerPos.x;
      const dy = targetY - playerPos.y;
      
      player.setVelocity(dx * 0.02, dy * 0.02);
    });
  }

  public start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.gameLoop();
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private gameLoop() {
    if (!this.isRunning) return;
    
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    // Apply speed control - skip updates if visuals are stopped
    if (!this.speedController.isVisualsStopped) {
      this.update(deltaTime * this.speedController.currentSpeed);
      this.render();
    } else {
      // Still render static field when visuals are stopped
      this.renderStaticField();
    }
    
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number = 16) {
    // Update game state, player positions, etc. with speed control
    const speedMultiplier = this.speedController.currentSpeed;
    this.players.forEach(player => player.update(deltaTime * speedMultiplier));
    this.ball.update(this.canvas.width, this.canvas.height, deltaTime * speedMultiplier);
  }

  private render() {
    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Render the dome field
    this.renderDomeField();

    // Render players and ball
    this.players.forEach(player => player.render(this.ctx));
    this.ball.render(this.ctx);
    
    // Render game info
    this.renderGameInfo();
  }

  private renderDomeField() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const fieldWidth = Math.min(this.canvas.width - 40, 400);
    const fieldHeight = Math.min(this.canvas.height - 40, 200);
    
    // Calculate oval field dimensions
    const fieldLeft = centerX - fieldWidth / 2;
    const fieldTop = centerY - fieldHeight / 2;
    const endRadius = fieldHeight / 2;

    // Create stadium field gradient
    const gradient = this.ctx.createLinearGradient(fieldLeft, fieldTop, fieldLeft + fieldWidth, fieldTop + fieldHeight);
    gradient.addColorStop(0, '#1a472a'); // Dark green
    gradient.addColorStop(0.5, '#166534'); // Medium green
    gradient.addColorStop(1, '#134e4a'); // Teal green

    // Draw oval/stadium field shape
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    
    // Draw the oval using path commands
    this.ctx.moveTo(fieldLeft + endRadius, fieldTop);
    this.ctx.lineTo(fieldLeft + fieldWidth - endRadius, fieldTop);
    this.ctx.arc(fieldLeft + fieldWidth - endRadius, fieldTop + endRadius, endRadius, -Math.PI/2, Math.PI/2);
    this.ctx.lineTo(fieldLeft + endRadius, fieldTop + fieldHeight);
    this.ctx.arc(fieldLeft + endRadius, fieldTop + endRadius, endRadius, Math.PI/2, -Math.PI/2);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw field boundary
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Draw center line
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, fieldTop + 10);
    this.ctx.lineTo(centerX, fieldTop + fieldHeight - 10);
    this.ctx.stroke();

    // Draw center circle
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw oval score zones at each end
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    
    // Left score zone (oval)
    this.ctx.beginPath();
    this.ctx.ellipse(fieldLeft + endRadius, centerY, 25, 45, 0, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Right score zone (oval)
    this.ctx.beginPath();
    this.ctx.ellipse(fieldLeft + fieldWidth - endRadius, centerY, 25, 45, 0, 0, Math.PI * 2);
    this.ctx.stroke();

    // Render stadium facilities if data available
    if (this.stadiumData) {
      this.renderStadiumFacilities(fieldLeft, fieldTop, fieldWidth, fieldHeight);
    }
  }

  private renderStadiumFacilities(fieldLeft: number, fieldTop: number, fieldWidth: number, fieldHeight: number) {
    if (!this.stadiumData) return;

    const { attendance, capacity, facilities, fanLoyalty } = this.stadiumData;

    // Calculate crowd density
    const fillRate = Math.min(attendance / capacity, 1.0);
    const loyaltyBonus = (fanLoyalty || 50) / 100;
    const crowdDensity = fillRate * loyaltyBonus;

    // Draw crowd representation around field
    const crowdAlpha = Math.max(0.1, crowdDensity * 0.6);
    this.ctx.fillStyle = `rgba(100, 50, 200, ${crowdAlpha})`;
    
    // Stadium seating areas
    const seatWidth = 15;
    const seatGap = 5;
    
    // Top seating
    this.ctx.fillRect(fieldLeft - seatWidth, fieldTop - seatWidth - seatGap, fieldWidth + seatWidth * 2, seatWidth);
    // Bottom seating  
    this.ctx.fillRect(fieldLeft - seatWidth, fieldTop + fieldHeight + seatGap, fieldWidth + seatWidth * 2, seatWidth);
    // Left seating
    this.ctx.fillRect(fieldLeft - seatWidth - seatGap, fieldTop - seatWidth, seatWidth, fieldHeight + seatWidth * 2);
    // Right seating
    this.ctx.fillRect(fieldLeft + fieldWidth + seatGap, fieldTop - seatWidth, seatWidth, fieldHeight + seatWidth * 2);

    // VIP Suites (if level > 0)
    if (facilities?.vipSuites > 0) {
      this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)'; // Gold for VIP
      const vipWidth = 8;
      const vipCount = facilities.vipSuites;
      
      for (let i = 0; i < vipCount; i++) {
        const vipX = fieldLeft + (fieldWidth * (i + 1)) / (vipCount + 1) - vipWidth / 2;
        this.ctx.fillRect(vipX, fieldTop - seatWidth - seatGap - vipWidth, vipWidth, vipWidth);
      }
    }

    // Lighting effects based on facility level
    if (facilities?.lighting > 0) {
      const lightingIntensity = Math.min(facilities.lighting / 5, 1.0);
      this.ctx.shadowColor = 'rgba(255, 255, 255, ' + (lightingIntensity * 0.3) + ')';
      this.ctx.shadowBlur = lightingIntensity * 20;
    }
  }

  private renderStaticField() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render just the field without moving elements
    this.renderDomeField();
    
    // Show "PAUSED FOR TEXT SUMMARY" overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⏸️ VIEWING TEXT SUMMARY', this.canvas.width / 2, this.canvas.height / 2);
    
    this.ctx.font = '14px Arial';
    this.ctx.fillText('Visuals paused for non-critical events', this.canvas.width / 2, this.canvas.height / 2 + 30);
  }

  private renderGameInfo() {
    // Render game time, score, etc.
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(10, 10, 240, 80);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Game ID: ${this.gameId}`, 20, 30);
    this.ctx.fillText(`Speed: ${this.speedController.currentSpeed}x`, 20, 50);
    this.ctx.fillText(`Status: ${this.speedController.isVisualsStopped ? 'TEXT MODE' : 'VISUAL'}`, 20, 70);
  }
  
  public destroy() {
    this.stop();
  }
  
  public getSpeedController() {
    return this.speedController;
  }
}

export default Game;