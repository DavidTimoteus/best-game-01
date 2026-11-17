import { ARENA_BOUNDS, CANVAS_HEIGHT, CANVAS_WIDTH, PALETTE, PILLAR_LAYOUT } from './constants.js';

function createSeededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildCourtyardLayer() {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  const rand = createSeededRandom(90421);

  // Outer stone parapet backdrop
  ctx.fillStyle = PALETTE.parapetSide;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Beveled stone parapet rim
  ctx.fillStyle = PALETTE.parapetTop;
  ctx.fillRect(24, 34, CANVAS_WIDTH - 48, CANVAS_HEIGHT - 60);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 34, CANVAS_WIDTH - 48, CANVAS_HEIGHT - 60);

  // Parapet crenellations / stone joints
  ctx.strokeStyle = 'rgba(26, 20, 16, 0.35)';
  ctx.lineWidth = 2;
  for (let x = 64; x < CANVAS_WIDTH - 48; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 34);
    ctx.lineTo(x, ARENA_BOUNDS.top);
    ctx.moveTo(x, ARENA_BOUNDS.bottom);
    ctx.lineTo(x, CANVAS_HEIGHT - 26);
    ctx.stroke();
  }

  // Sunlit courtyard floor base
  const floorGrad = ctx.createRadialGradient(
    ARENA_BOUNDS.centerX - 80,
    ARENA_BOUNDS.centerY - 70,
    60,
    ARENA_BOUNDS.centerX,
    ARENA_BOUNDS.centerY,
    680
  );
  floorGrad.addColorStop(0, PALETTE.stoneLight);
  floorGrad.addColorStop(0.65, PALETTE.stoneMid);
  floorGrad.addColorStop(1, PALETTE.stoneDark);

  ctx.fillStyle = floorGrad;
  ctx.fillRect(
    ARENA_BOUNDS.left,
    ARENA_BOUNDS.top,
    ARENA_BOUNDS.right - ARENA_BOUNDS.left,
    ARENA_BOUNDS.bottom - ARENA_BOUNDS.top
  );

  // Travertine flagstone grid with organic variation
  const tileW = 64;
  const tileH = 54;
  ctx.save();
  ctx.beginPath();
  ctx.rect(
    ARENA_BOUNDS.left,
    ARENA_BOUNDS.top,
    ARENA_BOUNDS.right - ARENA_BOUNDS.left,
    ARENA_BOUNDS.bottom - ARENA_BOUNDS.top
  );
  ctx.clip();

  for (let row = 0; row < 13; row++) {
    const offset = (row % 2) * (tileW * 0.5);
    const y = ARENA_BOUNDS.top + row * tileH;
    for (let col = -1; col < 20; col++) {
      const x = ARENA_BOUNDS.left + col * tileW + offset;
      const shade = rand();
      if (shade < 0.25) {
        ctx.fillStyle = 'rgba(255, 245, 224, 0.18)';
        ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);
      } else if (shade > 0.78) {
        ctx.fillStyle = 'rgba(130, 96, 52, 0.11)';
        ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);
      }

      // Mortar seam
      ctx.strokeStyle = 'rgba(104, 79, 48, 0.34)';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(x, y, tileW, tileH);

      // Subtle cracks on occasional slabs
      if (rand() < 0.14) {
        ctx.strokeStyle = 'rgba(65, 48, 30, 0.28)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x + 10 + rand() * 20, y + 8);
        ctx.lineTo(x + 26 + rand() * 14, y + 22 + rand() * 12);
        ctx.lineTo(x + 18 + rand() * 24, y + 40);
        ctx.stroke();
      }
    }
  }

  // Moss patches near corners and courtyard edges
  const mossSpots = [
    { x: 112, y: 120, r: 34 },
    { x: 1168, y: 128, r: 30 },
    { x: 118, y: 642, r: 38 },
    { x: 1162, y: 644, r: 34 },
    { x: 350, y: 102, r: 22 },
    { x: 930, y: 664, r: 24 },
  ];
  for (const spot of mossSpots) {
    for (let i = 0; i < 6; i++) {
      const ox = spot.x + (rand() - 0.5) * spot.r * 1.1;
      const oy = spot.y + (rand() - 0.5) * spot.r * 0.9;
      const mr = 8 + rand() * 14;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(88, 125, 68, 0.42)' : 'rgba(61, 89, 46, 0.38)';
      ctx.beginPath();
      ctx.arc(ox, oy, mr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Central inlaid Brass Sundial Medallion
  const cx = ARENA_BOUNDS.centerX;
  const cy = ARENA_BOUNDS.centerY;

  ctx.fillStyle = 'rgba(125, 80, 16, 0.14)';
  ctx.beginPath();
  ctx.arc(cx, cy, 186, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PALETTE.brassDark;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 180, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = PALETTE.brassMid;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 174, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 114, 0, Math.PI * 2);
  ctx.stroke();

  // 12 Sundial Hour Spokes & Numerals Ticks
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    const inner = i % 2 === 0 ? 114 : 154;
    const outer = 172;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(155, 102, 24, 0.65)' : 'rgba(155, 102, 24, 0.35)';
    ctx.lineWidth = i % 2 === 0 ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * inner, cy + Math.sin(ang) * inner);
    ctx.lineTo(cx + Math.cos(ang) * outer, cy + Math.sin(ang) * outer);
    ctx.stroke();
  }

  // Inner Compass Star
  ctx.fillStyle = 'rgba(212, 149, 38, 0.24)';
  ctx.strokeStyle = PALETTE.brassDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const rad = i % 2 === 0 ? 74 : 26;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner cast wall shadow along top & left parapet
  const wallShadowTop = ctx.createLinearGradient(0, ARENA_BOUNDS.top, 0, ARENA_BOUNDS.top + 36);
  wallShadowTop.addColorStop(0, 'rgba(20, 14, 10, 0.42)');
  wallShadowTop.addColorStop(1, 'rgba(20, 14, 10, 0)');
  ctx.fillStyle = wallShadowTop;
  ctx.fillRect(ARENA_BOUNDS.left, ARENA_BOUNDS.top, ARENA_BOUNDS.right - ARENA_BOUNDS.left, 36);

  const wallShadowLeft = ctx.createLinearGradient(ARENA_BOUNDS.left, 0, ARENA_BOUNDS.left + 32, 0);
  wallShadowLeft.addColorStop(0, 'rgba(20, 14, 10, 0.34)');
  wallShadowLeft.addColorStop(1, 'rgba(20, 14, 10, 0)');
  ctx.fillStyle = wallShadowLeft;
  ctx.fillRect(ARENA_BOUNDS.left, ARENA_BOUNDS.top, 32, ARENA_BOUNDS.bottom - ARENA_BOUNDS.top);

  // Pillar ground rings
  for (const p of PILLAR_LAYOUT) {
    ctx.fillStyle = 'rgba(90, 68, 42, 0.26)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 10, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Crisp courtyard inner ink border + gilded trim
  ctx.strokeStyle = PALETTE.brassMid;
  ctx.lineWidth = 4;
  ctx.strokeRect(
    ARENA_BOUNDS.left - 2,
    ARENA_BOUNDS.top - 2,
    ARENA_BOUNDS.right - ARENA_BOUNDS.left + 4,
    ARENA_BOUNDS.bottom - ARENA_BOUNDS.top + 4
  );

  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(
    ARENA_BOUNDS.left,
    ARENA_BOUNDS.top,
    ARENA_BOUNDS.right - ARENA_BOUNDS.left,
    ARENA_BOUNDS.bottom - ARENA_BOUNDS.top
  );

  // Four corner stone bastion turrets
  const corners = [
    [ARENA_BOUNDS.left - 6, ARENA_BOUNDS.top - 6],
    [ARENA_BOUNDS.right + 6, ARENA_BOUNDS.top - 6],
    [ARENA_BOUNDS.left - 6, ARENA_BOUNDS.bottom + 6],
    [ARENA_BOUNDS.right + 6, ARENA_BOUNDS.bottom + 6],
  ];
  for (const [bx, by] of corners) {
    ctx.fillStyle = '#473c33';
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx, by, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.brassMid;
    ctx.beginPath();
    ctx.arc(bx, by, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  return canvas;
}
