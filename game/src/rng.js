export function createRng(seed) {
  let state = (seed >>> 0) || 1;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) {
      return min + (max - min) * this.next();
    },
    int(min, maxInclusive) {
      return Math.floor(min + (maxInclusive - min + 1) * this.next());
    },
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
  };
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distSq(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function angleDiff(from, to) {
  return normalizeAngle(to - from);
}

export function rotateToward(current, target, maxStep) {
  const diff = angleDiff(current, target);
  if (Math.abs(diff) <= maxStep) return normalizeAngle(target);
  return normalizeAngle(current + Math.sign(diff) * maxStep);
}

export function isInsideBastion(x, y, margin = 0) {
  const cx = 640;
  const cy = 365;
  const rx = 430 - margin;
  const ry = 248 - margin;
  const chamfer = 98;
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  if (dx > rx || dy > ry) return false;
  return (dx / rx) + (dy / ry) <= 1.56 - (chamfer * 0.0005);
}

export function clampToBastion(x, y, margin = 20) {
  const cx = 640;
  const cy = 365;
  const rx = 430 - margin;
  const ry = 248 - margin;
  let nx = clamp(x, cx - rx, cx + rx);
  let ny = clamp(y, cy - ry, cy + ry);
  const norm = Math.abs(nx - cx) / rx + Math.abs(ny - cy) / ry;
  const limit = 1.52;
  if (norm > limit) {
    const scale = limit / norm;
    nx = cx + (nx - cx) * scale;
    ny = cy + (ny - cy) * scale;
  }
  return { x: nx, y: ny };
}
