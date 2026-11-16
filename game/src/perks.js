/**
 * Roguelite Core Upgrade Draft catalog and player modifier aggregator.
 * Choices stack cleanly and surface distinct badge telemetry on the HUD.
 */

export const PERK_CATALOG = [
  {
    id: 'magnetic_coil',
    code: 'COIL',
    name: 'MAGNETIC COIL',
    color: '#00F0FF',
    summary: '+140% orb attraction radius & +20% absorb score',
  },
  {
    id: 'arc_chain',
    code: 'ARC',
    name: 'ARC CHAIN',
    color: '#5CE1FF',
    summary: 'Matched bolt hits arc lightning to 2 nearby hostiles',
  },
  {
    id: 'nova_dash',
    code: 'NOVA',
    name: 'NOVA DASH',
    color: '#FF9E1B',
    summary: 'Chrono-Dash blasts a shockwave & cuts cooldown 25%',
  },
  {
    id: 'twin_pulse',
    code: 'TWIN',
    name: 'TWIN PULSE',
    color: '#32F5A8',
    summary: 'Dual parallel pulse emitters & +15% fire cadence',
  },
  {
    id: 'aegis_cap',
    code: 'AEGIS',
    name: 'AEGIS CAPACITOR',
    color: '#B44CFF',
    summary: '+35 Shield now, +25 Max Shield & +25% Overdrive gain',
  },
  {
    id: 'prism_crit',
    code: 'PRISM',
    name: 'PRISM OVERCLOCK',
    color: '#FF2E93',
    summary: '+45% matched polarity damage & bolts pierce +1 target',
  },
];

export function getPerkDef(id) {
  return PERK_CATALOG.find((p) => p.id === id) || PERK_CATALOG[0];
}

export function rollDraftChoices(installedIds = [], count = 3) {
  const counts = new Map();
  for (const id of installedIds) {
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const pool = [...PERK_CATALOG].sort((a, b) => {
    const ca = counts.get(a.id) || 0;
    const cb = counts.get(b.id) || 0;
    if (ca !== cb) return ca - cb;
    return Math.random() - 0.5;
  });
  return pool.slice(0, count);
}

export function computePerkStats(installedIds = []) {
  const counts = {};
  for (const id of installedIds) {
    counts[id] = (counts[id] || 0) + 1;
  }
  const coil = counts.magnetic_coil || 0;
  const arc = counts.arc_chain || 0;
  const nova = counts.nova_dash || 0;
  const twin = counts.twin_pulse || 0;
  const aegis = counts.aegis_cap || 0;
  const prism = counts.prism_crit || 0;

  return {
    pickupRadiusMult: 1 + coil * 1.4,
    orbScoreMult: 1 + coil * 0.2,
    arcBounces: arc > 0 ? 1 + arc : 0,
    arcDamageMult: 0.55 + Math.max(0, arc - 1) * 0.2,
    novaDashLevel: nova,
    dashCooldownMult: Math.pow(0.75, nova),
    extraProjectiles: twin > 0 ? 1 : 0,
    fireRateMult: 1 + twin * 0.15,
    maxShieldBonus: aegis * 25,
    overdriveGainMult: 1 + aegis * 0.25,
    matchedDamageMult: 1 + prism * 0.45,
    pierceCount: prism,
  };
}
