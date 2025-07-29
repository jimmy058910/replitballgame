class Player {
  private x: number;
  private y: number;
  private vx: number = 0;
  private vy: number = 0;
  private name: string;
  private speed: number;
  private power: number;
  private agility: number;
  private race: string;
  private teamColor: string;
  private role: string;
  private stamina: number;

  constructor(
    x: number, 
    y: number, 
    name: string, 
    speed: number = 5, 
    power: number = 5, 
    agility: number = 5,
    race: string = 'Human',
    teamColor: string = 'blue',
    role: string = 'Runner',
    stamina: number = 100
  ) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.speed = speed;
    this.power = power;
    this.agility = agility;
    this.race = race;
    this.teamColor = teamColor;
    this.role = role;
    this.stamina = stamina;
  }

  public update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // Apply friction
    this.vx *= 0.95;
    this.vy *= 0.95;
  }

  public render(ctx: CanvasRenderingContext2D) {
    // Draw player as colored circle
    ctx.fillStyle = this.teamColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player outline
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw player name (only on hover or selection)
    ctx.fillStyle = 'white';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.name.split(' ')[0], this.x, this.y + 20);
    
    // Draw role indicator
    ctx.fillStyle = this.getRoleColor();
    ctx.beginPath();
    ctx.arc(this.x + 6, this.y - 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private getRoleColor(): string {
    switch (this.role) {
      case 'Passer': return '#ffff00'; // Yellow
      case 'Runner': return '#00ff00'; // Green  
      case 'Blocker': return '#ff0000'; // Red
      default: return '#ffffff'; // White
    }
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

  public getAttributes() {
    return {
      speed: this.speed,
      power: this.power,
      agility: this.agility,
      stamina: this.stamina,
      race: this.race,
      role: this.role
    };
  }

  public updateFromGameData(playerData: any) {
    this.speed = playerData.speed || this.speed;
    this.power = playerData.power || this.power;
    this.agility = playerData.agility || this.agility;
    this.stamina = playerData.dailyStaminaLevel || this.stamina;
  }
}

export default Player;