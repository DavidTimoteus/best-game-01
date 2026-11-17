import { BEACON_POS, GAME_HEIGHT, GAME_WIDTH } from './constants.js';
import { clamp, dist, normalizeAngle } from './rng.js';

function raySegmentIntersect(ox, oy, dx, dy, x1, y1, x2, y2) {
  const sx = x2 - x1;
  const sy = y2 - y1;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-6) return null;

  const qpx = x1 - ox;
  const qpy = y1 - oy;
  const t = (qpx * sy - qpy * sx) / denom;
  const u = (qpx * dy - qpy * dx) / denom;

  if (t > 4 && u >= 0 && u <= 1) {
    return { t, u, x: ox + dx * t, y: oy + dy * t };
  }
  return null;
}

function rayCircleIntersect(ox, oy, dx, dy, cx, cy, r) {
  const fx = ox - cx;
  const fy = oy - cy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * c;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const t1 = (-b - root) * 0.5;
  const t2 = (-b + root) * 0.5;
  const t = t1 > 4 ? t1 : t2 > 4 ? t2 : -1;
  if (t <= 4) return null;
  return { t, x: ox + dx * t, y: oy + dy * t };
}

function rayViewportDistance(ox, oy, dx, dy) {
  let minT = 1600;
  if (dx > 1e-5) minT = Math.min(minT, (GAME_WIDTH + 60 - ox) / dx);
  else if (dx < -1e-5) minT = Math.min(minT, (-60 - ox) / dx);
  if (dy > 1e-5) minT = Math.min(minT, (GAME_HEIGHT + 60 - oy) / dy);
  else if (dy < -1e-5) minT = Math.min(minT, (-60 - oy) / dy);
  return Math.max(40, minT);
}

export function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const lenSq = vx * vx + vy * vy;
  if (lenSq < 1e-6) return Math.hypot(px - ax, py - ay);
  const t = clamp((wx * vx + wy * vy) / lenSq, 0, 1);
  const projX = ax + t * vx;
  const projY = ay + t * vy;
  return Math.hypot(px - projX, py - projY);
}

export function segmentIntersection(a, b) {
  const dax = a.x2 - a.x1;
  const day = a.y2 - a.y1;
  const dbx = b.x2 - b.x1;
  const dby = b.y2 - b.y1;
  const denom = dax * dby - day * dbx;
  if (Math.abs(denom) < 1e-5) return null;
  const qpx = b.x1 - a.x1;
  const qpy = b.y1 - a.y1;
  const t = (qpx * dby - qpy * dbx) / denom;
  const u = (qpx * day - qpy * dax) / denom;
  if (t > 0.05 && t < 0.95 && u > 0.05 && u < 0.95) {
    return {
      x: a.x1 + dax * t,
      y: a.y1 + day * t,
    };
  }
  return null;
}

export function solveOpticalNetwork(beaconAngle, nodes, options = {}) {
  const maxBounces = options.maxBounces ?? 6;
  const maxRays = options.maxRays ?? 18;
  const mirrorHalfLen = options.mirrorHalfLen ?? 31;
  const baseWidth = options.baseWidth ?? 1;

  for (const node of nodes) {
    node.lit = false;
    node.incomingAngle = null;
    node.hitCount = 0;
  }

  const segments = [];
  const flares = [];
  const intersections = [];

  const queue = [
    {
      ox: BEACON_POS.x + Math.cos(beaconAngle) * (BEACON_POS.radius - 4),
      oy: BEACON_POS.y + Math.sin(beaconAngle) * (BEACON_POS.radius - 4),
      angle: beaconAngle,
      bounce: 0,
      color: 'gold',
      power: 1.0,
      sourceId: 'beacon',
    },
  ];

  let peakBounce = 0;

  while (queue.length > 0 && segments.length < maxRays) {
    const ray = queue.shift();
    const dx = Math.cos(ray.angle);
    const dy = Math.sin(ray.angle);

    let bestHit = null;
    let bestDist = rayViewportDistance(ray.ox, ray.oy, dx, dy);

    for (const node of nodes) {
      if (node.carried || node.id === ray.sourceId) continue;

      if (node.kind === 'splitter') {
        const hit = rayCircleIntersect(ray.ox, ray.oy, dx, dy, node.x, node.y, 21);
        if (hit && hit.t < bestDist) {
          bestDist = hit.t;
          bestHit = { node, x: hit.x, y: hit.y };
        }
      } else {
        const half = mirrorHalfLen * (node.scale || 1);
        const tx = -Math.sin(node.angle);
        const ty = Math.cos(node.angle);
        const x1 = node.x - tx * half;
        const y1 = node.y - ty * half;
        const x2 = node.x + tx * half;
        const y2 = node.y + ty * half;
        const hit = raySegmentIntersect(ray.ox, ray.oy, dx, dy, x1, y1, x2, y2);
        if (hit && hit.t < bestDist) {
          bestDist = hit.t;
          bestHit = { node, x: hit.x, y: hit.y };
        }
      }
    }

    const endX = bestHit ? bestHit.x : ray.ox + dx * bestDist;
    const endY = bestHit ? bestHit.y : ray.oy + dy * bestDist;
    const overchargeBoost = ray.overcharged ? 1.45 : 1.0;

    segments.push({
      x1: ray.ox,
      y1: ray.oy,
      x2: endX,
      y2: endY,
      angle: ray.angle,
      bounce: ray.bounce,
      color: ray.color,
      power: ray.power * overchargeBoost,
      widthScale: baseWidth * (ray.overcharged ? 1.35 : 1.0),
      sourceId: ray.sourceId,
    });

    if (ray.bounce > peakBounce) {
      peakBounce = ray.bounce;
    }

    if (bestHit && ray.bounce < maxBounces) {
      const node = bestHit.node;
      node.lit = true;
      node.incomingAngle = ray.angle;
      node.hitCount += 1;

      const nodeOvercharged = node.overchargeTimer > 0;
      flares.push({
        x: bestHit.x,
        y: bestHit.y,
        color: node.kind === 'splitter' ? (node.prismTint || 'cyan') : ray.color,
        scale: nodeOvercharged ? 1.45 : 1.0,
      });

      if (node.hitCount > 2) {
        continue;
      }

      if (node.kind === 'splitter') {
        const offsets = [-0.46, 0, 0.46];
        const paletteCycle = node.prismTint === 'crimson'
          ? ['crimson', 'gold', 'crimson']
          : ['cyan', 'gold', 'cyan'];

        for (let i = 0; i < offsets.length; i++) {
          const outAngle = normalizeAngle(node.angle + offsets[i]);
          queue.push({
            ox: node.x + Math.cos(outAngle) * 23,
            oy: node.y + Math.sin(outAngle) * 23,
            angle: outAngle,
            bounce: ray.bounce + 1,
            color: paletteCycle[i],
            power: ray.power * 0.78,
            overcharged: nodeOvercharged || ray.overcharged,
            sourceId: node.id,
          });
        }
      } else {
        let nx = Math.cos(node.angle);
        let ny = Math.sin(node.angle);
        const dotDN = dx * nx + dy * ny;
        if (dotDN > 0) {
          nx = -nx;
          ny = -ny;
        }
        const reflDot = dx * nx + dy * ny;
        const rx = dx - 2 * reflDot * nx;
        const ry = dy - 2 * reflDot * ny;
        const outAngle = Math.atan2(ry, rx);
        const nextColor = ray.bounce === 0 ? 'gold' : ray.bounce % 2 === 1 ? 'cyan' : 'gold';

        queue.push({
          ox: bestHit.x + rx * 2,
          oy: bestHit.y + ry * 2,
          angle: outAngle,
          bounce: ray.bounce + 1,
          color: ray.color === 'crimson' ? 'crimson' : nextColor,
          power: ray.power * (nodeOvercharged ? 1.15 : 0.96),
          overcharged: nodeOvercharged || ray.overcharged,
          sourceId: node.id,
        });
      }
    }
  }

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const pt = segmentIntersection(segments[i], segments[j]);
      if (pt && dist(pt.x, pt.y, BEACON_POS.x, BEACON_POS.y) > BEACON_POS.radius + 8) {
        intersections.push(pt);
      }
    }
  }

  return {
    segments,
    flares,
    intersections,
    peakBounce: peakBounce + 1,
  };
}

export function aimMirrorTowardPoint(node, targetX, targetY) {
  if (dist(node.x, node.y, targetX, targetY) < 18) {
    node.angle = normalizeAngle(node.angle + Math.PI / 6);
    return;
  }
  if (node.kind === 'splitter') {
    node.angle = Math.atan2(targetY - node.y, targetX - node.x);
    return;
  }
  const desiredOut = Math.atan2(targetY - node.y, targetX - node.x);
  if (node.incomingAngle !== null && node.incomingAngle !== undefined) {
    const revInX = -Math.cos(node.incomingAngle);
    const revInY = -Math.sin(node.incomingAngle);
    const outX = Math.cos(desiredOut);
    const outY = Math.sin(desiredOut);
    const bx = revInX + outX;
    const by = revInY + outY;
    if (Math.hypot(bx, by) > 0.05) {
      node.angle = Math.atan2(by, bx);
      return;
    }
  }
  node.angle = desiredOut;
}
