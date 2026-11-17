import { BASTION_BOUNDS, BEACON_POS, GAME_HEIGHT, GAME_WIDTH, PALETTE } from './constants.js';
import { createRng } from './rng.js';

function getOctagonPoints(cx, cy, rx, ry, chamferRatio = 0.34) {
  const ox = rx * (1 - chamferRatio);
  const oy = ry * (1 - chamferRatio);
  return [
    { x: cx - ox, y: cy - ry },
    { x: cx + ox, y: cy - ry },
    { x: cx + rx, y: cy - oy },
    { x: cx + rx, y: cy + oy },
    { x: cx + ox, y: cy + ry },
    { x: cx - ox, y: cy + ry },
    { x: cx - rx, y: cy + oy },
    { x: cx - rx, y: cy - oy },
  ];
}

function tracePolygon(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
}

export class BastionEnvironment {
  constructor() {
    this.staticCanvas = document.createElement('canvas');
    this.staticCanvas.width = GAME_WIDTH;
    this.staticCanvas.height = GAME_HEIGHT;
    this.waveSeeds = [];
    this.buildStaticBackdrop();
  }

  buildStaticBackdrop() {
    const ctx = this.staticCanvas.getContext('2d');
    const rng = createRng(48151623);

    const seaGrad = ctx.createRadialGradient(
      BEACON_POS.x,
      BEACON_POS.y,
      140,
      BEACON_POS.x,
      BEACON_POS.y,
      780
    );
    seaGrad.addColorStop(0, '#13345f');
    seaGrad.addColorStop(0.5, '#0a1c3a');
    seaGrad.addColorStop(1, '#040915');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Subtle deep-water reef silhouettes
    for (let i = 0; i < 18; i++) {
      const rx = rng.range(40, GAME_WIDTH - 40);
      const ry = rng.range(40, GAME_HEIGHT - 40);
      const rad = rng.range(45, 130);
      const rg = ctx.createRadialGradient(rx, ry, 5, rx, ry, rad);
      rg.addColorStop(0, 'rgba(20, 62, 102, 0.22)');
      rg.addColorStop(1, 'rgba(5, 13, 30, 0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(rx, ry, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 42; i++) {
      this.waveSeeds.push({
        x: rng.range(20, GAME_WIDTH - 20),
        y: rng.range(20, GAME_HEIGHT - 20),
        len: rng.range(36, 95),
        phase: rng.range(0, Math.PI * 2),
        speed: rng.range(0.7, 1.4),
      });
    }

    const { cx, cy, rx, ry } = BASTION_BOUNDS;

    // Cliffside shadow & dark basalt shelf
    const cliffPts = getOctagonPoints(cx, cy + 16, rx + 34, ry + 32, 0.34);
    tracePolygon(ctx, cliffPts);
    ctx.fillStyle = 'rgba(2, 6, 15, 0.72)';
    ctx.fill();

    const basaltPts = getOctagonPoints(cx, cy + 10, rx + 20, ry + 20, 0.34);
    tracePolygon(ctx, basaltPts);
    ctx.fillStyle = '#252a38';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#111520';
    ctx.stroke();

    // Outer sandstone bevel
    const outerPts = getOctagonPoints(cx, cy + 4, rx + 8, ry + 8, 0.34);
    tracePolygon(ctx, outerPts);
    ctx.fillStyle = PALETTE.stoneDark;
    ctx.fill();

    // Main sandstone terrace
    const deckPts = getOctagonPoints(cx, cy, rx, ry, 0.34);
    ctx.save();
    tracePolygon(ctx, deckPts);
    ctx.clip();

    const stoneGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, rx + 40);
    stoneGrad.addColorStop(0, PALETTE.stoneHighlight);
    stoneGrad.addColorStop(0.55, PALETTE.stoneLight);
    stoneGrad.addColorStop(1, PALETTE.stoneMid);
    ctx.fillStyle = stoneGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Flagstone masonry grid
    ctx.strokeStyle = 'rgba(84, 67, 42, 0.25)';
    ctx.lineWidth = 1.5;
    const tileW = 54;
    const tileH = 38;
    for (let row = 0; row < 20; row++) {
      const y = cy - ry + row * tileH;
      ctx.beginPath();
      ctx.moveTo(cx - rx - 10, y);
      ctx.lineTo(cx + rx + 10, y);
      ctx.stroke();
      const offset = (row % 2) * (tileW * 0.5);
      for (let col = 0; col < 20; col++) {
        const x = cx - rx + col * tileW + offset;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + tileH);
        ctx.stroke();
      }
    }

    // Subtle stone grain
    for (let i = 0; i < 420; i++) {
      const gx = rng.range(cx - rx, cx + rx);
      const gy = rng.range(cy - ry, cy + ry);
      ctx.fillStyle = rng.next() > 0.5 ? 'rgba(255,248,225,0.14)' : 'rgba(92,74,46,0.12)';
      ctx.fillRect(gx, gy, rng.range(2, 5), rng.range(2, 4));
    }

    // Concentric Brass Observatory Rings & Optical Conduit Lines
    const rings = [98, 178, 258];
    for (const r of rings) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.18, r * 0.78, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(130, 92, 32, 0.42)';
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.18, r * 0.78, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(235, 190, 96, 0.52)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // 8 compass conduit channels
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4;
      const ex = cx + Math.cos(ang) * 410;
      const ey = cy + Math.sin(ang) * 238;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 42, cy + Math.sin(ang) * 42);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = 'rgba(155, 114, 44, 0.32)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Inner recessed dais shadow
    ctx.beginPath();
    ctx.arc(cx, cy, 56, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(55, 42, 24, 0.25)';
    ctx.fill();
    ctx.restore();

    // Crisp Bastion Parapet Rim & Corner Pedestals
    tracePolygon(ctx, deckPts);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#5c492d';
    ctx.stroke();

    for (const pt of deckPts) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#473924';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.brass;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#7ff3ff';
      ctx.fill();
    }
  }

  drawBackdrop(ctx, time) {
    ctx.drawImage(this.staticCanvas, 0, 0);

    // Animated shoreline seafoam pulse around the octagon cliff
    const { cx, cy, rx, ry } = BASTION_BOUNDS;
    const swell = Math.sin(time * 2.1) * 5;
    const foamPts = getOctagonPoints(cx, cy + 12, rx + 26 + swell, ry + 26 + swell * 0.7, 0.34);

    ctx.save();
    tracePolygon(ctx, foamPts);
    ctx.strokeStyle = 'rgba(127, 232, 255, 0.24)';
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 14]);
    ctx.lineDashOffset = -time * 18;
    ctx.stroke();

    const outerFoam = getOctagonPoints(cx, cy + 14, rx + 42 - swell * 0.6, ry + 40 - swell * 0.4, 0.34);
    tracePolygon(ctx, outerFoam);
    ctx.strokeStyle = 'rgba(92, 186, 238, 0.14)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([12, 22]);
    ctx.lineDashOffset = time * 12;
    ctx.stroke();

    // Rolling open-sea wave crests
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    for (const w of this.waveSeeds) {
      const dx = Math.abs(w.x - cx);
      const dy = Math.abs(w.y - cy);
      if (dx < rx + 28 && dy < ry + 28) continue;
      const alpha = 0.11 + 0.08 * Math.sin(time * w.speed + w.phase);
      const shiftX = Math.sin(time * 0.9 + w.phase) * 9;
      ctx.strokeStyle = `rgba(130, 225, 255, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w.x + shiftX, w.y);
      ctx.quadraticCurveTo(w.x + shiftX + w.len * 0.5, w.y - 5, w.x + shiftX + w.len, w.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
