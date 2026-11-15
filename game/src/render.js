// High-Performance Vector Canvas Renderer
import {
  VIEW_WIDTH,
  VIEW_HEIGHT,
  POLARITY_CYAN,
  COLOR_CYAN,
  COLOR_AMBER,
  COLOR_MAGENTA,
  COLOR_WHITE,
  COLOR_DARK_BG,
  COLOR_GRID_LINE,
} from './config.js';

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gridOffset = 0;
  }

  clear() {
    this.ctx.fillStyle = COLOR_DARK_BG;
    this.ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  drawGrid(dt) {
    this.gridOffset = (this.gridOffset + dt * 40) % 50;
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = COLOR_GRID_LINE;
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= VIEW_WIDTH; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, VIEW_HEIGHT);
      ctx.stroke();
    }

    // Horizontal moving lines
    for (let y = this.gridOffset; y <= VIEW_HEIGHT; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_WIDTH, y);
      ctx.stroke();
    }

    // Border vignette
    const grad = ctx.createRadialGradient(
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2,
      VIEW_HEIGHT * 0.4,
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2,
      VIEW_WIDTH * 0.65,
    );
    grad.addColorStop(0, 'rgba(6, 8, 20, 0)');
    grad.addColorStop(1, 'rgba(3, 4, 10, 0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.restore();
  }

  drawHUD(world) {
    const ctx = this.ctx;
    const p = world.player;

    ctx.save();

    // Top Header Bar
    ctx.fillStyle = 'rgba(6, 10, 24, 0.75)';
    ctx.fillRect(0, 0, VIEW_WIDTH, 56);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 56);
    ctx.lineTo(VIEW_WIDTH, 56);
    ctx.stroke();

    // Sector Badge
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = COLOR_CYAN;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur = 6;
    ctx.fillText(`SECTOR 0${world.sector} / 04`, 28, 34);

    // Score & Combo
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.fillText(`SCORE: ${p.score.toLocaleString()}`, VIEW_WIDTH / 2 - 80, 34);

    if (p.combo > 1) {
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = COLOR_AMBER;
      ctx.shadowColor = COLOR_AMBER;
      ctx.shadowBlur = 8;
      ctx.fillText(`COMBO x${p.combo}`, VIEW_WIDTH / 2 + 130, 34);
    }

    // Shield Integrity Bar (Bottom Left)
    const barX = 30;
    const barY = VIEW_HEIGHT - 38;
    const barW = 220;
    const barH = 14;

    ctx.font = '12px monospace';
    ctx.fillStyle = '#a0aec0';
    ctx.shadowBlur = 0;
    ctx.fillText(`SHIELD INTEGRITY: ${Math.max(0, Math.round(p.shield))}%`, barX, barY - 8);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(barX, barY, barW, barH);

    const shieldPct = Math.max(0, p.shield) / 100;
    const sColor = shieldPct > 0.4 ? COLOR_CYAN : COLOR_MAGENTA;
    ctx.fillStyle = sColor;
    ctx.shadowColor = sColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(barX, barY, barW * shieldPct, barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Polarity Status & Dash (Bottom Right)
    const polColor = p.polarity === POLARITY_CYAN ? COLOR_CYAN : COLOR_AMBER;
    const polName = p.polarity === POLARITY_CYAN ? 'CYAN' : 'AMBER';

    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = polColor;
    ctx.shadowColor = polColor;
    ctx.shadowBlur = 8;
    ctx.fillText(`POLARITY: ${polName} [Q / SHIFT]`, VIEW_WIDTH - 280, VIEW_HEIGHT - 42);

    const dashReady = p.dashCooldown <= 0;
    ctx.font = '12px monospace';
    ctx.fillStyle = dashReady ? '#ffffff' : '#718096';
    ctx.shadowColor = dashReady ? '#ffffff' : 'transparent';
    ctx.shadowBlur = dashReady ? 5 : 0;
    ctx.fillText(
      dashReady ? 'CHRONO-DASH: READY [SPACE]' : `DASH RECHARGING: ${p.dashCooldown.toFixed(1)}s`,
      VIEW_WIDTH - 280,
      VIEW_HEIGHT - 22,
    );

    ctx.restore();
  }
}
