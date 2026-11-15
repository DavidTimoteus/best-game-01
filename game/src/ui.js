// UI Screens: Title, Victory, and Game Over Overlays
import {
  VIEW_WIDTH,
  VIEW_HEIGHT,
  COLOR_CYAN,
  COLOR_AMBER,
  COLOR_MAGENTA,
  COLOR_WHITE,
} from './config.js';

export class UIRenderer {
  static renderTitle(ctx, pulse = 0) {
    ctx.save();

    // Dark backdrop overlay
    ctx.fillStyle = 'rgba(6, 8, 20, 0.88)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Glowing Decorative Hexagon
    ctx.save();
    ctx.translate(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 90);
    ctx.rotate(pulse * 0.4);
    ctx.strokeStyle = COLOR_CYAN;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur = 24;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const px = Math.cos(a) * 75;
      const py = Math.sin(a) * 75;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Inner amber triangle
    ctx.rotate(-pulse * 0.8);
    ctx.strokeStyle = COLOR_AMBER;
    ctx.shadowColor = COLOR_AMBER;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const px = Math.cos(a) * 45;
      const py = Math.sin(a) * 45;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Game Title
    ctx.textAlign = 'center';
    ctx.font = '900 48px monospace';
    ctx.fillStyle = COLOR_WHITE;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur = 20;
    ctx.fillText('GRID PRISM', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 35);

    ctx.font = '700 20px monospace';
    ctx.fillStyle = COLOR_AMBER;
    ctx.shadowColor = COLOR_AMBER;
    ctx.shadowBlur = 10;
    ctx.fillText('// POLARITY PROTOCOL //', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 70);

    // Mission Directive & Mechanics
    ctx.font = '14px monospace';
    ctx.fillStyle = '#a0aec0';
    ctx.shadowBlur = 0;
    ctx.fillText('HARMONIZE FREQUENCIES: ABSORB MATCHING NODES - DEFLECT OPPOSING BARRIERS', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 115);

    // Control Diagram
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(VIEW_WIDTH / 2 - 320, VIEW_HEIGHT / 2 + 140, 640, 48);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.strokeRect(VIEW_WIDTH / 2 - 320, VIEW_HEIGHT / 2 + 140, 640, 48);

    ctx.font = '13px monospace';
    ctx.fillStyle = '#edf2f7';
    ctx.fillText('[W, A, S, D / ARROWS] MOVE   •   [SHIFT / Q] SWITCH POLARITY   •   [SPACE] CHRONO-DASH', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 170);

    // Pulsing CTA button
    const btnAlpha = 0.6 + Math.sin(pulse * 4) * 0.4;
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = `rgba(0, 240, 255, ${btnAlpha})`;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur = 15;
    ctx.fillText('PRESS [SPACE] OR CLICK TO INITIALIZE CORE', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 235);

    ctx.restore();
  }

  static renderGameOver(ctx, world) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 8, 20, 0.92)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.textAlign = 'center';

    // Heading
    ctx.font = '900 44px monospace';
    ctx.fillStyle = COLOR_MAGENTA;
    ctx.shadowColor = COLOR_MAGENTA;
    ctx.shadowBlur = 25;
    ctx.fillText('NEURAL LINK SEVERED', VIEW_WIDTH / 2, 210);

    ctx.font = '600 18px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.shadowBlur = 4;
    ctx.fillText('MISSION TERMINATED - SHIELD DEPLETED', VIEW_WIDTH / 2, 250);

    // Debrief Box
    const boxX = VIEW_WIDTH / 2 - 240;
    const boxY = 290;
    const boxW = 480;
    const boxH = 190;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = 'rgba(255, 0, 119, 0.4)';
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.textAlign = 'left';
    ctx.font = '16px monospace';
    ctx.fillStyle = '#cbd5e0';
    ctx.shadowBlur = 0;

    ctx.fillText(`FINAL SCORE:`, boxX + 35, boxY + 45);
    ctx.fillText(`SECTOR REACHED:`, boxX + 35, boxY + 80);
    ctx.fillText(`NODES HARMONIZED:`, boxX + 35, boxY + 115);
    ctx.fillText(`SURVIVAL TIME:`, boxX + 35, boxY + 150);

    ctx.textAlign = 'right';
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = COLOR_CYAN;
    ctx.fillText(`${world.player.score.toLocaleString()}`, boxX + boxW - 35, boxY + 45);
    ctx.fillStyle = COLOR_AMBER;
    ctx.fillText(`SECTOR 0${world.sector}`, boxX + boxW - 35, boxY + 80);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${world.player.absorbedCount}`, boxX + boxW - 35, boxY + 115);
    ctx.fillText(`${world.survivalTime.toFixed(1)}s`, boxX + boxW - 35, boxY + 150);

    // Restart CTA
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = COLOR_CYAN;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur = 12;
    ctx.fillText('PRESS [R] OR CLICK TO REBOOT SIMULATION', VIEW_WIDTH / 2, 540);

    ctx.restore();
  }

  static renderVictory(ctx, world) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 8, 20, 0.92)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.textAlign = 'center';

    // Heading
    ctx.font = '900 44px monospace';
    ctx.fillStyle = COLOR_CYAN;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur = 25;
    ctx.fillText('SYSTEM HARMONIZED', VIEW_WIDTH / 2, 210);

    ctx.font = '600 18px monospace';
    ctx.fillStyle = COLOR_AMBER;
    ctx.shadowColor = COLOR_AMBER;
    ctx.shadowBlur = 10;
    ctx.fillText('ALL SECTORS SECURED - CORE STABILIZED', VIEW_WIDTH / 2, 250);

    // Debrief Box
    const boxX = VIEW_WIDTH / 2 - 240;
    const boxY = 290;
    const boxW = 480;
    const boxH = 190;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.textAlign = 'left';
    ctx.font = '16px monospace';
    ctx.fillStyle = '#cbd5e0';
    ctx.shadowBlur = 0;

    ctx.fillText(`GRAND SCORE:`, boxX + 35, boxY + 45);
    ctx.fillText(`STATUS:`, boxX + 35, boxY + 80);
    ctx.fillText(`TOTAL HARMONIZATIONS:`, boxX + 35, boxY + 115);
    ctx.fillText(`TOTAL TIME:`, boxX + 35, boxY + 150);

    ctx.textAlign = 'right';
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = COLOR_CYAN;
    ctx.fillText(`${world.player.score.toLocaleString()}`, boxX + boxW - 35, boxY + 45);
    ctx.fillStyle = COLOR_AMBER;
    ctx.fillText(`PERFECT CLEAR`, boxX + boxW - 35, boxY + 80);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${world.player.absorbedCount}`, boxX + boxW - 35, boxY + 115);
    ctx.fillText(`${world.survivalTime.toFixed(1)}s`, boxX + boxW - 35, boxY + 150);

    // Restart CTA
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = COLOR_CYAN;
    ctx.shadowColor = COLOR_CYAN;
    ctx.shadowBlur = 12;
    ctx.fillText('PRESS [R] OR CLICK TO COMMENCE NEW ODYSSEY', VIEW_WIDTH / 2, 540);

    ctx.restore();
  }
}
