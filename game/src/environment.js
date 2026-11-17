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
    this.seaStacks = [];
    this.harborLanterns = [];
    this.cornerBraziers = [];
    this.buildStaticBackdrop();
  }

  buildStaticBackdrop() {
    const ctx = this.staticCanvas.getContext('2d');
    const rng = createRng(48151623);
    const { cx, cy, rx, ry } = BASTION_BOUNDS;

    // 1. Layered Midnight-Indigo Coastal Ocean
    const seaGrad = ctx.createRadialGradient(cx + 60, cy, 120, cx, cy, 820);
    seaGrad.addColorStop(0, '#16416f');
    seaGrad.addColorStop(0.45, '#0b2144');
    seaGrad.addColorStop(0.85, '#061229');
    seaGrad.addColorStop(1, '#030814');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Submerged reef shoals & deep currents
    for (let i = 0; i < 24; i++) {
      const rxp = rng.range(30, GAME_WIDTH - 30);
      const ryp = rng.range(30, GAME_HEIGHT - 30);
      const rad = rng.range(50, 145);
      const rg = ctx.createRadialGradient(rxp, ryp, 6, rxp, ryp, rad);
      rg.addColorStop(0, i % 2 === 0 ? 'rgba(26, 86, 130, 0.25)' : 'rgba(10, 32, 68, 0.28)');
      rg.addColorStop(1, 'rgba(5, 13, 30, 0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(rxp, ryp, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 56; i++) {
      this.waveSeeds.push({
        x: rng.range(18, GAME_WIDTH - 18),
        y: rng.range(18, GAME_HEIGHT - 18),
        len: rng.range(34, 96),
        phase: rng.range(0, Math.PI * 2),
        speed: rng.range(0.75, 1.55),
      });
    }

    // 2. Jagged Coastal Sea-Stacks & Reef Rocks around the Bastion
    const rockSpecs = [
      { x: 118, y: 155, r: 34, seed: 11 },
      { x: 152, y: 558, r: 40, seed: 22 },
      { x: 1152, y: 142, r: 38, seed: 33 },
      { x: 1178, y: 546, r: 44, seed: 44 },
      { x: 1098, y: 312, r: 24, seed: 55 },
      { x: 245, y: 668, r: 26, seed: 66 },
      { x: 985, y: 664, r: 29, seed: 77 },
      { x: 1020, y: 68, r: 25, seed: 88 },
    ];
    for (const spec of rockSpecs) {
      this.drawSeaStack(ctx, spec, rng);
      this.seaStacks.push(spec);
    }

    // 3. Weathered Wooden Harbor Piers with Pilings & Hanging Lanterns
    const piers = [
      { x: cx + rx - 8, y: cy + 56, angle: 0.14, len: 104, width: 28 },
      { x: cx - rx + 12, y: cy + 68, angle: Math.PI - 0.12, len: 92, width: 26 },
      { x: cx + 195, y: cy + ry - 12, angle: Math.PI * 0.5 + 0.08, len: 68, width: 26 },
    ];
    for (const pier of piers) {
      this.drawWoodenPier(ctx, pier);
    }

    // 4. Stepped Basalt Cliff Dropoff & Sandstone Bastion Bevel
    const cliffPts = getOctagonPoints(cx, cy + 18, rx + 34, ry + 32, 0.34);
    tracePolygon(ctx, cliffPts);
    ctx.fillStyle = 'rgba(2, 6, 15, 0.78)';
    ctx.fill();

    const basaltPts = getOctagonPoints(cx, cy + 11, rx + 21, ry + 21, 0.34);
    tracePolygon(ctx, basaltPts);
    ctx.fillStyle = '#202636';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0d121d';
    ctx.stroke();

    const outerWallPts = getOctagonPoints(cx, cy + 5, rx + 9, ry + 9, 0.34);
    tracePolygon(ctx, outerWallPts);
    ctx.fillStyle = '#6f5c41';
    ctx.fill();

    // 5. Main Weathered Sandstone Courtyard
    const deckPts = getOctagonPoints(cx, cy, rx, ry, 0.34);
    ctx.save();
    tracePolygon(ctx, deckPts);
    ctx.clip();

    const stoneGrad = ctx.createRadialGradient(cx, cy, 32, cx, cy, rx + 44);
    stoneGrad.addColorStop(0, PALETTE.stoneHighlight);
    stoneGrad.addColorStop(0.55, PALETTE.stoneLight);
    stoneGrad.addColorStop(0.88, PALETTE.stoneMid);
    stoneGrad.addColorStop(1, '#988361');
    ctx.fillStyle = stoneGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Flagstone masonry grid
    ctx.strokeStyle = 'rgba(84, 67, 42, 0.26)';
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

    // Coastal moss & weathering near outer parapet edges
    for (let i = 0; i < 65; i++) {
      const ang = rng.range(0, Math.PI * 2);
      const px = cx + Math.cos(ang) * rng.range(rx * 0.72, rx * 0.98);
      const py = cy + Math.sin(ang) * rng.range(ry * 0.72, ry * 0.98);
      ctx.fillStyle = 'rgba(54, 88, 70, 0.16)';
      ctx.beginPath();
      ctx.arc(px, py, rng.range(8, 22), 0, Math.PI * 2);
      ctx.fill();
    }

    // Stone grain speckles
    for (let i = 0; i < 460; i++) {
      const gx = rng.range(cx - rx, cx + rx);
      const gy = rng.range(cy - ry, cy + ry);
      ctx.fillStyle = rng.next() > 0.5 ? 'rgba(255,248,225,0.15)' : 'rgba(82,64,38,0.13)';
      ctx.fillRect(gx, gy, rng.range(2, 5), rng.range(2, 4));
    }

    // Carved Astrolabe Rings & Brass Optical Conduits
    const rings = [98, 178, 258];
    for (const r of rings) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.18, r * 0.78, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(116, 82, 26, 0.45)';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.18, r * 0.78, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(242, 198, 102, 0.58)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // 16-point Astrolabe Compass Star Rays & Degree Ticks
    for (let k = 0; k < 16; k++) {
      const ang = (k * Math.PI) / 8;
      const major = k % 2 === 0;
      const innerR = major ? 44 : 108;
      const outerR = major ? 405 : 225;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * innerR, cy + Math.sin(ang) * innerR * 0.72);
      ctx.lineTo(cx + Math.cos(ang) * outerR, cy + Math.sin(ang) * outerR * 0.62);
      ctx.strokeStyle = major ? 'rgba(155, 114, 44, 0.36)' : 'rgba(155, 114, 44, 0.2)';
      ctx.lineWidth = major ? 3 : 1.5;
      ctx.stroke();
    }

    // Central recessed sandstone dais
    ctx.beginPath();
    ctx.arc(cx, cy, 62, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(55, 42, 24, 0.26)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(235, 190, 96, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 6. Stepped Stone Parapet Rim & Crenellation Blocks
    tracePolygon(ctx, deckPts);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#524027';
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d6bc8b';
    ctx.stroke();

    for (let i = 0; i < deckPts.length; i++) {
      const a = deckPts[i];
      const b = deckPts[(i + 1) % deckPts.length];
      for (const t of [0.24, 0.5, 0.76]) {
        const mx = a.x + (b.x - a.x) * t;
        const my = a.y + (b.y - a.y) * t;
        const edgeAng = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(edgeAng);
        ctx.fillStyle = '#8b7453';
        ctx.strokeStyle = '#3d2f1c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-14, -6, 28, 12, 3);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 7. 8 Brass Corner Observatory Pedestals
    for (const pt of deckPts) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#3b2e1c';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#18141c';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8.5, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.brass;
      ctx.fill();

      this.cornerBraziers.push({ x: pt.x, y: pt.y });
    }
  }

  drawSeaStack(ctx, spec, rng) {
    const pts = [];
    const count = 9;
    for (let i = 0; i < count; i++) {
      const a = (i * Math.PI * 2) / count;
      const rad = spec.r * rng.range(0.72, 1.18);
      pts.push({ x: spec.x + Math.cos(a) * rad, y: spec.y + Math.sin(a) * rad * 0.78 });
    }
    // Deep water shadow
    ctx.fillStyle = 'rgba(2, 6, 15, 0.58)';
    ctx.beginPath();
    ctx.ellipse(spec.x + 4, spec.y + 8, spec.r * 1.15, spec.r * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rock body
    tracePolygon(ctx, pts);
    ctx.fillStyle = '#253147';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#111826';
    ctx.stroke();

    // Highlight ridge
    ctx.beginPath();
    ctx.arc(spec.x - spec.r * 0.18, spec.y - spec.r * 0.15, spec.r * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(84, 108, 145, 0.34)';
    ctx.fill();
  }

  drawWoodenPier(ctx, pier) {
    ctx.save();
    ctx.translate(pier.x, pier.y);
    ctx.rotate(pier.angle);

    // Water shadow
    ctx.fillStyle = 'rgba(2, 6, 15, 0.52)';
    ctx.fillRect(0, -pier.width * 0.5 + 6, pier.len + 6, pier.width);

    // Timber decking
    ctx.fillStyle = '#5a4129';
    ctx.strokeStyle = '#1e150d';
    ctx.lineWidth = 2;
    ctx.fillRect(0, -pier.width * 0.5, pier.len, pier.width);
    ctx.strokeRect(0, -pier.width * 0.5, pier.len, pier.width);

    // Plank seams
    ctx.strokeStyle = 'rgba(26, 17, 10, 0.55)';
    ctx.lineWidth = 1.4;
    for (let px = 10; px < pier.len; px += 11) {
      ctx.beginPath();
      ctx.moveTo(px, -pier.width * 0.5);
      ctx.lineTo(px, pier.width * 0.5);
      ctx.stroke();
    }

    // Pilings
    for (const px of [pier.len * 0.45, pier.len - 5]) {
      for (const py of [-pier.width * 0.52, pier.width * 0.52]) {
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#3b2919';
        ctx.fill();
        ctx.strokeStyle = '#140e08';
        ctx.stroke();
      }
    }
    ctx.restore();

    // Record swaying lantern position at pier tip
    const lx = pier.x + Math.cos(pier.angle) * (pier.len - 4);
    const ly = pier.y + Math.sin(pier.angle) * (pier.len - 4);
    this.harborLanterns.push({ x: lx, y: ly, phase: pier.x * 0.03 });
  }

  drawBackdrop(ctx, time) {
    ctx.drawImage(this.staticCanvas, 0, 0);

    const { cx, cy, rx, ry } = BASTION_BOUNDS;
    const swell = Math.sin(time * 2.1) * 5;

    ctx.save();
    // Breaking surf foam around sea-stacks
    for (const rock of this.seaStacks) {
      const rPulse = rock.r + 7 + Math.sin(time * 2.4 + rock.seed) * 3;
      ctx.strokeStyle = 'rgba(138, 236, 255, 0.28)';
      ctx.lineWidth = 2.6;
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = -time * 14;
      ctx.beginPath();
      ctx.ellipse(rock.x, rock.y + 2, rPulse, rPulse * 0.78, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Animated shoreline seafoam pulse around the octagon cliff
    const foamPts = getOctagonPoints(cx, cy + 12, rx + 26 + swell, ry + 26 + swell * 0.7, 0.34);
    tracePolygon(ctx, foamPts);
    ctx.strokeStyle = 'rgba(132, 234, 255, 0.28)';
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 14]);
    ctx.lineDashOffset = -time * 18;
    ctx.stroke();

    const outerFoam = getOctagonPoints(cx, cy + 14, rx + 42 - swell * 0.6, ry + 40 - swell * 0.4, 0.34);
    tracePolygon(ctx, outerFoam);
    ctx.strokeStyle = 'rgba(92, 186, 238, 0.16)';
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
      const alpha = 0.12 + 0.09 * Math.sin(time * w.speed + w.phase);
      const shiftX = Math.sin(time * 0.9 + w.phase) * 9;
      ctx.strokeStyle = `rgba(138, 228, 255, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(w.x + shiftX, w.y);
      ctx.quadraticCurveTo(w.x + shiftX + w.len * 0.5, w.y - 5, w.x + shiftX + w.len, w.y);
      ctx.stroke();
    }

    // Swaying Pier Lanterns & Water Reflections
    for (const l of this.harborLanterns) {
      const sway = Math.sin(time * 2.6 + l.phase) * 2.2;
      const lx = l.x + sway;
      const ly = l.y;
      const waterGrad = ctx.createRadialGradient(lx, ly + 14, 2, lx, ly + 14, 34);
      waterGrad.addColorStop(0, 'rgba(255, 206, 98, 0.38)');
      waterGrad.addColorStop(1, 'rgba(255, 190, 72, 0)');
      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.ellipse(lx, ly + 14, 34, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe9a3';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#c47b24';
      ctx.stroke();
    }

    // Flickering Cyan-Gold Corner Observatory Braziers
    for (let i = 0; i < this.cornerBraziers.length; i++) {
      const b = this.cornerBraziers[i];
      const r = 4.2 + Math.sin(time * 8 + i) * 0.8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(110, 244, 255, 0.22)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#9cf8ff';
      ctx.fill();
    }

    ctx.restore();
  }
}
