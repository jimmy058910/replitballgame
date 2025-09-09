/**
 * Oval Field Renderer for Dome-Based Visualization
 * Renders the oval field with 6v6 player positions and dynamic orb movement
 */

import { LiveMatchState, MatchEvent, FieldPlayer } from '../../../shared/types/LiveMatchState';
import type { Player } from '@shared/types/models';


export class OvalFieldRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private centerX: number;
  private centerY: number;
  private fieldRadius: number;
  
  // Game state
  private liveState: LiveMatchState | null = null;
  private orbPosition: { x: number; y: number } = { x: 0, y: 0 };
  private playerPositions: Map<string, { x: number; y: number }> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.fieldRadius = Math.min(this.width, this.height) / 2 - 20;

    // Initialize orb at center
    this.orbPosition = { x: this.centerX, y: this.centerY };
    
    this.initializePlayerPositions();
  }

  /**
   * Initialize player positions in dome formation
   */
  private initializePlayerPositions() {
    // Home team (left side) - 6 players in dome formation
    const homePositions = this.getDomeFormation(this.centerX - 100, this.centerY);
    
    // Away team (right side) - 6 players in dome formation  
    const awayPositions = this.getDomeFormation(this.centerX + 100, this.centerY);
    
    // Store initial positions
    for (let i = 0; i < 6; i++) {
      this.playerPositions.set(`home_${i}`, homePositions[i]);
      this.playerPositions.set(`away_${i}`, awayPositions[i]);
    }
  }

  /**
   * Get dome formation positions for a team
   */
  private getDomeFormation(centerX: number, centerY: number): Array<{ x: number; y: number }> {
    const positions = [];
    const radius = 60;
    
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      positions.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      });
    }
    
    return positions;
  }

  /**
   * Update renderer with new live state
   */
  updateState(state: LiveMatchState) {
    this.liveState = state;
    this.updatePlayerPositionsFromState();
  }

  /**
   * Update player positions based on live state
   */
  private updatePlayerPositionsFromState() {
    if (!this.liveState) return;

    // Update home team positions
    this.updateTeamPositions(this.liveState.activeFieldPlayers.home, 'home');
    
    // Update away team positions
    this.updateTeamPositions(this.liveState.activeFieldPlayers.away, 'away');
  }

  /**
   * Update team player positions
   */
  private updateTeamPositions(team: any, teamPrefix: string) {
    const players = [
      team.passer,
      ...team.runners,
      ...team.blockers,
      team.wildcard
    ];

    players.forEach((player, index) => {
      if (player.role) {
        this.playerPositions.set(`${teamPrefix}_${index}`, {
          x: player.role.x,
          y: player.role.y
        });
      }
    });
  }

  /**
   * Process match event for visual updates
   */
  processEvent(event: MatchEvent) {
    // Update orb position based on event
    if (event.position) {
      this.orbPosition = {
        x: Math.max(20, Math.min(this.width - 20, event.position.x)),
        y: Math.max(20, Math.min(this.height - 20, event.position.y))
      };
    }

    // Animate players based on event type
    this.animateEventResponse(event);
  }

  /**
   * Animate player response to events
   */
  private animateEventResponse(event: MatchEvent) {
    switch (event.type) {
      case 'PASS_ATTEMPT':
        this.animatePassAttempt(event);
        break;
      case 'SCRUM':
        this.animateScrum();
        break;
      case 'SCORE':
        this.animateScore(event);
        break;
    }
  }

  /**
   * Animate pass attempt
   */
  private animatePassAttempt(event: MatchEvent) {
    // Move orb in arc toward target
    const startX = this.orbPosition.x;
    const startY = this.orbPosition.y;
    const targetX = event.position?.x || this.centerX;
    const targetY = event.position?.y || this.centerY;
    
    // Simple linear interpolation for now
    this.orbPosition.x = startX + (targetX - startX) * 0.1;
    this.orbPosition.y = startY + (targetY - startY) * 0.1;
  }

  /**
   * Animate scrum formation
   */
  private animateScrum() {
    // Move all players toward center for scrum
    this.playerPositions.forEach((pos, playerId) => {
      pos.x += (this.centerX - pos.x) * 0.05;
      pos.y += (this.centerY - pos.y) * 0.05;
    });
    
    // Center the orb
    this.orbPosition = { x: this.centerX, y: this.centerY };
  }

  /**
   * Animate score celebration
   */
  private animateScore(event: MatchEvent) {
    // Flash effect or celebration animation could go here
    console.log('Score animation for event:', event);
  }

  /**
   * Main render function
   */
  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Render field background
    this.renderField();
    
    // Render players
    this.renderPlayers();
    
    // Render orb
    this.renderOrb();
    
    // Render overlay elements
    this.renderOverlay();
  }

  /**
   * Render the proper dome field with scoring zones and field markings
   */
  private renderField() {
    // Main field (oval/rounded-rectangle for dome)
    this.ctx.fillStyle = '#23864c'; // Deep green field
    this.ctx.beginPath();
    this.ctx.ellipse(this.centerX, this.centerY, this.fieldRadius, this.fieldRadius * 0.6, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Scoring zones (end zones) with transparency
    this.ctx.fillStyle = 'rgba(31, 58, 45, 0.7)'; // Darker green with transparency
    
    // Left scoring zone
    this.ctx.fillRect(this.centerX - this.fieldRadius, this.centerY - this.fieldRadius * 0.4, 80, this.fieldRadius * 0.8);
    
    // Right scoring zone  
    this.ctx.fillRect(this.centerX + this.fieldRadius - 80, this.centerY - this.fieldRadius * 0.4, 80, this.fieldRadius * 0.8);
    
    // Field border (oval)
    this.ctx.strokeStyle = '#f8f8f8'; // Off-white lines
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.ellipse(this.centerX, this.centerY, this.fieldRadius, this.fieldRadius * 0.6, 0, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Midfield line
    this.ctx.strokeStyle = '#f8f8f8';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.centerX, this.centerY - this.fieldRadius * 0.6);
    this.ctx.lineTo(this.centerX, this.centerY + this.fieldRadius * 0.6);
    this.ctx.stroke();
    
    // Center circle with dome scoring area
    this.ctx.strokeStyle = '#f8f8f8';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, 60, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Goal markers in scoring zones
    this.ctx.fillStyle = '#f8f8f8';
    this.ctx.fillRect(this.centerX - this.fieldRadius + 5, this.centerY - 15, 10, 30);
    this.ctx.fillRect(this.centerX + this.fieldRadius - 15, this.centerY - 15, 10, 30);
    
    // Add field markings - yard/intensity lines
    this.ctx.strokeStyle = '#f8f8f8';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);
    
    // Quarter lines
    this.ctx.beginPath();
    this.ctx.moveTo(this.centerX - this.fieldRadius * 0.5, this.centerY - this.fieldRadius * 0.4);
    this.ctx.lineTo(this.centerX - this.fieldRadius * 0.5, this.centerY + this.fieldRadius * 0.4);
    this.ctx.moveTo(this.centerX + this.fieldRadius * 0.5, this.centerY - this.fieldRadius * 0.4);
    this.ctx.lineTo(this.centerX + this.fieldRadius * 0.5, this.centerY + this.fieldRadius * 0.4);
    this.ctx.stroke();
    
    this.ctx.setLineDash([]);
    
    // Center circle
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, 50, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Score zones (left and right ends)
    this.renderScoreZones();
    
    // Field markers
    this.renderFieldMarkers();
  }

  /**
   * Render scoring zones
   */
  private renderScoreZones() {
    // Left score zone
    this.ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'; // Blue
    this.ctx.beginPath();
    this.ctx.arc(this.centerX - this.fieldRadius * 0.7, this.centerY, 60, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Right score zone
    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; // Red
    this.ctx.beginPath();
    this.ctx.arc(this.centerX + this.fieldRadius * 0.7, this.centerY, 60, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Render field markers and lines
   */
  private renderFieldMarkers() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    
    // Concentric circles for depth
    for (let i = 1; i <= 3; i++) {
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, (this.fieldRadius / 4) * i, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  /**
   * Render all players
   */
  private renderPlayers() {
    if (!this.liveState) {
      // Render placeholder players
      this.renderPlaceholderPlayers();
      return;
    }

    // Render home team
    this.renderTeamPlayers(this.liveState.activeFieldPlayers.home, '#3b82f6', 'home');
    
    // Render away team
    this.renderTeamPlayers(this.liveState.activeFieldPlayers.away, '#ef4444', 'away');
  }

  /**
   * Render placeholder players when no live state
   */
  private renderPlaceholderPlayers() {
    this.playerPositions.forEach((pos, playerId) => {
      const isHome = playerId.startsWith('home');
      this.renderPlayer(pos.x, pos.y, isHome ? '#3b82f6' : '#ef4444', playerId);
    });
  }

  /**
   * Render team players
   */
  private renderTeamPlayers(team: any, color: string, teamPrefix: string) {
    const players = [
      team.passer,
      ...team.runners,
      ...team.blockers,
      team.wildcard
    ];

    players.forEach((player, index) => {
      const pos = this.playerPositions.get(`${teamPrefix}_${index}`);
      if (pos) {
        this.renderPlayer(pos.x, pos.y, color, `${player.firstName} ${player.lastName}`, player.role, player.stamina);
      }
    });
  }

  /**
   * Render individual player
   */
  private renderPlayer(x: number, y: number, color: string, name: string, role?: string, stamina?: number) {
    // Player circle
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Player outline
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Role indicator
    if (role) {
      this.ctx.fillStyle = this.getRoleColor(role);
      this.ctx.beginPath();
      this.ctx.arc(x + 6, y - 6, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Stamina indicator
    if (stamina !== undefined) {
      this.renderStaminaBar(x, y + 12, stamina);
    }
    
    // Player name (small)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '8px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(name.split(' ')[0] || name, x, y + 25);
  }

  /**
   * Get color for player role
   */
  private getRoleColor(role: string): string {
    switch (role) {
      case 'Passer': return '#ffff00'; // Yellow
      case 'Runner': return '#00ff00'; // Green
      case 'Blocker': return '#ff0000'; // Red
      default: return '#ffffff'; // White
    }
  }

  /**
   * Render stamina bar for player
   */
  private renderStaminaBar(x: number, y: number, stamina: number) {
    const barWidth = 16;
    const barHeight = 2;
    const staminaPercent = stamina / 100;
    
    // Background
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.fillRect(x - barWidth/2, y, barWidth, barHeight);
    
    // Stamina fill
    this.ctx.fillStyle = staminaPercent > 0.5 ? '#00ff00' : staminaPercent > 0.25 ? '#ffff00' : '#ff0000';
    this.ctx.fillRect(x - barWidth/2, y, barWidth * staminaPercent, barHeight);
  }

  /**
   * Render the orb
   */
  private renderOrb() {
    // Orb glow effect
    const gradient = this.ctx.createRadialGradient(
      this.orbPosition.x, this.orbPosition.y, 0,
      this.orbPosition.x, this.orbPosition.y, 6
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.7, '#cccccc');
    gradient.addColorStop(1, 'rgba(136, 136, 136, 0.5)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(this.orbPosition.x, this.orbPosition.y, 6, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Orb highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(this.orbPosition.x - 1, this.orbPosition.y - 1, 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Render overlay elements
   */
  private renderOverlay() {
    if (!this.liveState) return;
    
    // Possession indicator
    this.renderPossessionIndicator();
    
    // Active boost indicators
    this.renderActiveBoosts();
  }

  /**
   * Render possession indicator
   */
  private renderPossessionIndicator() {
    // Simple possession indicator near orb
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⚡', this.orbPosition.x, this.orbPosition.y - 15);
  }

  /**
   * Render active boosts
   */
  private renderActiveBoosts() {
    // Render boost indicators around players with active boosts
    if (!this.liveState) return;
    
    // Implementation would show boost effects visually
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Cleanup any animation frames or resources
  }
}