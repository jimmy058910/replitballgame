/**
 * Stadium Visualizer for Facility-Based Rendering
 * Renders stadium facilities, crowd, and atmosphere effects based on facility levels
 */

import { FacilityLevels } from '../../../shared/types/LiveMatchState';
import type { Stadium } from '@shared/types/models';


export class StadiumVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  
  // Stadium state
  private facilityLevels: FacilityLevels = {
    capacity: 5000,
    concessions: 0,
    parking: 0,
    vipSuites: 0,
    merchandising: 0,
    lightingScreens: 0,
    security: 1
  };
  
  private attendance: number = 0;
  private crowdSprites: Array<{ x: number; y: number; color: string }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    
    this.initializeCrowdSprites();
  }

  /**
   * Initialize crowd sprites for stadium visualization
   */
  private initializeCrowdSprites() {
    // Generate crowd sprites around the field perimeter
    const numSprites = 50; // Base number, will be scaled by attendance
    
    for (let i = 0; i < numSprites; i++) {
      const angle = (i / numSprites) * Math.PI * 2;
      const radius = Math.min(this.width, this.height) / 2 + 20; // Outside field radius
      
      this.crowdSprites.push({
        x: this.width / 2 + Math.cos(angle) * radius,
        y: this.height / 2 + Math.sin(angle) * radius,
        color: this.getRandomCrowdColor()
      });
    }
  }

  /**
   * Get random crowd member color
   */
  private getRandomCrowdColor(): string {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Update facility levels
   */
  updateFacilities(facilities: FacilityLevels) {
    this.facilityLevels = facilities;
  }

  /**
   * Update attendance
   */
  updateAttendance(attendance: number) {
    this.attendance = attendance;
  }

  /**
   * Main render function
   */
  render() {
    // Render stadium atmosphere based on lighting level
    this.renderStadiumAtmosphere();
    
    // Render crowd based on attendance
    this.renderCrowd();
    
    // Render facility elements
    this.renderFacilities();
    
    // Render lighting effects
    this.renderLightingEffects();
  }

  /**
   * Render stadium atmosphere
   */
  private renderStadiumAtmosphere() {
    // Background atmosphere based on lighting level
    const lightingLevel = this.facilityLevels.lightingScreens;
    const brightness = 0.1 + (lightingLevel * 0.02); // Base 10% + 2% per level
    
    // Create atmosphere gradient
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height)
    );
    
    gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness * 0.5})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${1 - brightness})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Render crowd based on attendance and capacity
   */
  private renderCrowd() {
    const attendanceRatio = this.attendance / this.facilityLevels.capacity;
    const visibleCrowd = Math.floor(this.crowdSprites.length * attendanceRatio);
    
    for (let i = 0; i < visibleCrowd; i++) {
      const sprite = this.crowdSprites[i];
      this.renderCrowdMember(sprite.x, sprite.y, sprite.color);
    }
  }

  /**
   * Render individual crowd member
   */
  private renderCrowdMember(x: number, y: number, color: string) {
    // Simple crowd representation as small colored dots
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Add some randomness for crowd movement
    const sway = Math.sin(Date.now() * 0.001 + x * 0.01) * 0.5;
    this.ctx.fillStyle = `${color}80`; // Semi-transparent
    this.ctx.beginPath();
    this.ctx.arc(x + sway, y, 1, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Render stadium facilities
   */
  private renderFacilities() {
    // Render concessions
    if (this.facilityLevels.concessions > 0) {
      this.renderConcessions();
    }
    
    // Render VIP suites
    if (this.facilityLevels.vipSuites > 0) {
      this.renderVIPSuites();
    }
    
    // Render parking (background element)
    if (this.facilityLevels.parking > 0) {
      this.renderParkingArea();
    }
    
    // Render merchandising stands
    if (this.facilityLevels.merchandising > 0) {
      this.renderMerchandisingStands();
    }
  }

  /**
   * Render concession stands
   */
  private renderConcessions() {
    const level = this.facilityLevels.concessions;
    const numStands = Math.min(level, 4); // Max 4 visible stands
    
    for (let i = 0; i < numStands; i++) {
      const angle = (i / numStands) * Math.PI * 0.5; // Quarter circle distribution
      const radius = Math.min(this.width, this.height) / 2 + 40;
      const x = this.width / 2 + Math.cos(angle) * radius;
      const y = this.height / 2 + Math.sin(angle) * radius;
      
      // Render concession stand
      this.ctx.fillStyle = '#8B4513'; // Brown
      this.ctx.fillRect(x - 5, y - 5, 10, 10);
      
      // Render queue indicator
      this.ctx.fillStyle = '#FFD700'; // Gold
      this.ctx.beginPath();
      this.ctx.arc(x, y - 8, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Render VIP suites
   */
  private renderVIPSuites() {
    const level = this.facilityLevels.vipSuites;
    
    // Render VIP boxes mid-sideline
    for (let i = 0; i < level; i++) {
      const x = this.width / 2 - 100 + (i * 40);
      const y = this.height / 2 - Math.min(this.width, this.height) / 2 - 30;
      
      // VIP box
      this.ctx.fillStyle = '#FFD700'; // Gold
      this.ctx.fillRect(x, y, 30, 15);
      
      // VIP box border
      this.ctx.strokeStyle = '#FFA500'; // Orange
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, 30, 15);
      
      // VIP indicator
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '8px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('VIP', x + 15, y + 10);
    }
  }

  /**
   * Render parking area
   */
  private renderParkingArea() {
    const level = this.facilityLevels.parking;
    
    // Render animated car rows behind stands
    for (let row = 0; row < level; row++) {
      const y = this.height - 20 - (row * 8);
      const numCars = 8;
      
      for (let car = 0; car < numCars; car++) {
        const x = 20 + (car * 15);
        
        // Simple car representation
        this.ctx.fillStyle = this.getRandomCarColor();
        this.ctx.fillRect(x, y, 12, 6);
        
        // Car highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(x + 2, y + 1, 8, 2);
      }
    }
  }

  /**
   * Get random car color
   */
  private getRandomCarColor(): string {
    const colors = ['#ff0000', '#0000ff', '#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Render merchandising stands
   */
  private renderMerchandisingStands() {
    const level = this.facilityLevels.merchandising;
    
    // Render merch stands around perimeter
    for (let i = 0; i < level; i++) {
      const angle = (i / level) * Math.PI * 2;
      const radius = Math.min(this.width, this.height) / 2 + 60;
      const x = this.width / 2 + Math.cos(angle) * radius;
      const y = this.height / 2 + Math.sin(angle) * radius;
      
      // Merch stand
      this.ctx.fillStyle = '#4169E1'; // Royal Blue
      this.ctx.fillRect(x - 4, y - 4, 8, 8);
      
      // Merch indicator
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '6px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('$', x, y + 2);
    }
  }

  /**
   * Render lighting effects
   */
  private renderLightingEffects() {
    const lightingLevel = this.facilityLevels.lightingScreens;
    
    if (lightingLevel === 0) return;
    
    // Field lighting bloom effect
    const bloomRadius = 20 + (lightingLevel * 10);
    const bloomIntensity = 0.1 + (lightingLevel * 0.05);
    
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, bloomRadius
    );
    
    gradient.addColorStop(0, `rgba(255, 255, 255, ${bloomIntensity})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(this.width / 2, this.height / 2, bloomRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Stadium light poles
    this.renderLightPoles(lightingLevel);
  }

  /**
   * Render stadium light poles
   */
  private renderLightPoles(level: number) {
    const numPoles = Math.min(level * 2, 8); // 2 poles per level, max 8
    
    for (let i = 0; i < numPoles; i++) {
      const angle = (i / numPoles) * Math.PI * 2;
      const radius = Math.min(this.width, this.height) / 2 + 80;
      const x = this.width / 2 + Math.cos(angle) * radius;
      const y = this.height / 2 + Math.sin(angle) * radius;
      
      // Light pole
      this.ctx.strokeStyle = '#888888';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x, y - 40);
      this.ctx.stroke();
      
      // Light fixture
      this.ctx.fillStyle = '#FFFF99';
      this.ctx.beginPath();
      this.ctx.arc(x, y - 40, 4, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Light beam
      const beamGradient = this.ctx.createRadialGradient(
        x, y - 40, 0,
        x, y - 40, 30
      );
      beamGradient.addColorStop(0, 'rgba(255, 255, 153, 0.3)');
      beamGradient.addColorStop(1, 'rgba(255, 255, 153, 0)');
      
      this.ctx.fillStyle = beamGradient;
      this.ctx.beginPath();
      this.ctx.arc(x, y - 40, 30, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Render crowd energy visualization
   */
  renderCrowdEnergy(energy: number) {
    // Energy level affects crowd movement and color intensity
    const intensity = energy / 100;
    
    // Update crowd sprite animation based on energy
    this.crowdSprites.forEach(sprite => {
      // More energetic crowd movement
      const energyFactor = 1 + intensity;
      sprite.x += (Math.random() - 0.5) * energyFactor;
      sprite.y += (Math.random() - 0.5) * energyFactor;
    });
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Cleanup any resources or animations
    this.crowdSprites = [];
  }
}