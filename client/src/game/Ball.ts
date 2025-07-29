class Ball {
  private x: number;
  private y: number;
  private vx: number = 0;
  private vy: number = 0;
  private radius: number = 4;
  private possession: string | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public update(canvasWidth: number, canvasHeight: number, deltaTime: number = 16) {
    // Apply speed control to movement
    const timeMultiplier = deltaTime / 16; // Normalize to 60fps baseline
    
    this.x += this.vx * timeMultiplier;
    this.y += this.vy * timeMultiplier;

    // Collision with walls (dome boundaries)
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const domeRadius = Math.min(canvasWidth, canvasHeight) / 2 - 20;
    
    const distFromCenter = Math.sqrt(
      Math.pow(this.x - centerX, 2) + Math.pow(this.y - centerY, 2)
    );

    if (distFromCenter + this.radius > domeRadius) {
      // Calculate collision normal
      const normalX = (this.x - centerX) / distFromCenter;
      const normalY = (this.y - centerY) / distFromCenter;
      
      // Reflect velocity
      const dotProduct = this.vx * normalX + this.vy * normalY;
      this.vx -= 2 * dotProduct * normalX;
      this.vy -= 2 * dotProduct * normalY;
      
      // Move ball back inside dome
      this.x = centerX + normalX * (domeRadius - this.radius);
      this.y = centerY + normalY * (domeRadius - this.radius);
    }

    // Apply friction
    this.vx *= 0.98;
    this.vy *= 0.98;
  }

  public render(ctx: CanvasRenderingContext2D) {
    // Draw ball with glow effect for orb-like appearance
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.7, '#cccccc');
    gradient.addColorStop(1, '#888888');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(this.x - 1, this.y - 1, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  public setVelocity(vx: number, vy: number) {
    this.vx = vx;
    this.vy = vy;
  }

  public setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public getPosition() {
    return { x: this.x, y: this.y };
  }

  public setPossession(playerName: string | null) {
    this.possession = playerName;
  }

  public getPossession() {
    return this.possession;
  }

  public updateFromEvent(eventData: any) {
    // Update ball position based on game events
    if (eventData.type === 'PASS_ATTEMPT') {
      this.setPosition(eventData.x || this.x, eventData.y || this.y);
      this.setVelocity(
        (eventData.targetX - this.x) * 0.1,
        (eventData.targetY - this.y) * 0.1
      );
    } else if (eventData.type === 'SCRUM') {
      // Ball in center during scrum
      this.setVelocity(0, 0);
    }
  }
}

export default Ball;