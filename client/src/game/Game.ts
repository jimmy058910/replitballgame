import Player from './Player';
import Ball from './Ball';

interface GameData {
  homeTeam: any;
  awayTeam: any;
  liveState: any;
  events: any[];
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private players: Player[] = [];
  private ball: Ball;
  private gameId: string;
  private isRunning: boolean = false;
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement, gameId: string) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gameId = gameId;
    this.ball = new Ball(this.canvas.width / 2, this.canvas.height / 2);
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

    // Update ball position from game events
    if (gameData.events && gameData.events.length > 0) {
      const latestEvent = gameData.events[0];
      this.ball.updateFromEvent(latestEvent);
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
    
    this.update();
    this.render();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Update game state, player positions, etc.
    this.players.forEach(player => player.update());
    this.ball.update(this.canvas.width, this.canvas.height);
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
    const radius = Math.min(this.canvas.width, this.canvas.height) / 2 - 20;

    // Create dome gradient
    const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, '#1a472a'); // Dark green center
    gradient.addColorStop(0.8, '#166534'); // Medium green
    gradient.addColorStop(1, '#052e16'); // Dark green edge

    // Fill dome
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw dome boundary
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    // Draw center circle
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw score zones (circular areas)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;
    
    // Left score zone
    this.ctx.beginPath();
    this.ctx.arc(centerX - radius * 0.7, centerY, 40, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Right score zone
    this.ctx.beginPath();
    this.ctx.arc(centerX + radius * 0.7, centerY, 40, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private renderGameInfo() {
    // Render game time, score, etc.
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 200, 60);
    
    this.ctx.fillStyle = 'white';
    this.ctx.font = '14px Arial';
    this.ctx.fillText(`Game ID: ${this.gameId}`, 20, 30);
    this.ctx.fillText(`Players: ${this.players.length}`, 20, 50);
  }

  public destroy() {
    this.stop();
    this.players = [];
  }
}

export default Game;