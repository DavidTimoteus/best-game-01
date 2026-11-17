import { BEACON_POS, ENEMY_SPECS } from './constants.js';
import { clampToBastion, dist } from './rng.js';

export function createKeeper() {
  return {
    x: 525,
    y: 410,
    vx: 0,
    vy: 0,
    radius: 15,
    speed: 242,
    aimAngle: -0.45,
    walkPhase: 0,
    fireCooldown: 0,
    pulseCooldown: 0,
    carryingNodeId: null,
    invulnTimer: 0,
  };
}

export function createInitialNodes() {
  return [
    {
      id: 'mirror_nw',
      kind: 'mirror',
      x: 515,
      y: 256,
      angle: 1.96,
      portable: false,
      carried: false,
      lit: false,
      incomingAngle: null,
      overchargeTimer: 0,
      scale: 1,
      hitCount: 0,
    },
    {
      id: 'mirror_ne',
      kind: 'mirror',
      x: 765,
      y: 256,
      angle: 1.18,
      portable: false,
      carried: false,
      lit: false,
      incomingAngle: null,
      overchargeTimer: 0,
      scale: 1,
      hitCount: 0,
    },
    {
      id: 'splitter_s',
      kind: 'splitter',
      x: 640,
      y: 492,
      angle: -Math.PI / 2,
      portable: false,
      carried: false,
      lit: false,
      incomingAngle: null,
      overchargeTimer: 0,
      prismTint: 'cyan',
      scale: 1,
      hitCount: 0,
    },
    {
      id: 'mirror_portable_1',
      kind: 'mirror',
      x: 460,
      y: 462,
      angle: -0.36,
      portable: true,
      carried: false,
      lit: false,
      incomingAngle: null,
      overchargeTimer: 0,
      scale: 1,
      hitCount: 0,
    },
  ];
}

export function spawnEnemy(type, nightNumber, rng) {
  const spec = ENEMY_SPECS[type];
  const scaleMult = 1 + (nightNumber - 1) * 0.14;
  const spawnAng = rng.range(0, Math.PI * 2);
  const rx = 525;
  const ry = 325;
  const x = BEACON_POS.x + Math.cos(spawnAng) * rx;
  const y = BEACON_POS.y + Math.sin(spawnAng) * ry;

  return {
    id: `${type}_${Math.floor(rng.next() * 1e9)}`,
    type,
    name: spec.name,
    isBoss: Boolean(spec.isBoss),
    x,
    y,
    vx: 0,
    vy: 0,
    radius: spec.radius,
    hp: Math.round(spec.hp * scaleMult),
    maxHp: Math.round(spec.hp * scaleMult),
    speed: spec.speed,
    damage: spec.damage,
    score: spec.score,
    color: spec.color,
    accent: spec.accent,
    shadowWeakness: spec.shadowWeakness,
    wobble: rng.range(0, Math.PI * 2),
    hitFlash: 0,
    burnTimer: 0,
    slowTimer: 0,
    litThisFrame: false,
    beamHits: 0,
    actionTimer: rng.range(1.4, 2.8),
    phase: 1,
    hasSummonedPhase2: false,
    hasSummonedPhase3: false,
    anchorPoint: clampToBastion(
      BEACON_POS.x + Math.cos(spawnAng) * 285,
      BEACON_POS.y + Math.sin(spawnAng) * 175,
      36
    ),
  };
}

export function findNearestNode(nodes, x, y, maxDist = 9999, predicate = null) {
  let best = null;
  let bestD = maxDist;
  for (const node of nodes) {
    if (node.carried) continue;
    if (predicate && !predicate(node)) continue;
    const d = dist(x, y, node.x, node.y);
    if (d < bestD) {
      bestD = d;
      best = node;
    }
  }
  return best;
}
