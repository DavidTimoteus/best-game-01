import { RELIC_CATALOG } from './constants.js';

export function renderRelicSvg(glyph) {
  const shapes = {
    astrolabe: `
      <circle cx="32" cy="32" r="21" fill="none" stroke="#f7c948" stroke-width="3"/>
      <circle cx="32" cy="32" r="11" fill="none" stroke="#34b3c7" stroke-width="2.5"/>
      <polygon points="32,7 36,24 53,32 36,40 32,57 28,40 11,32 28,24" fill="#f7c948"/>`,
    mirror: `
      <polygon points="32,8 50,24 44,54 20,54 14,24" fill="#2c8fa0" stroke="#f7c948" stroke-width="3"/>
      <line x1="22" y1="20" x2="42" y2="44" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="28" y1="16" x2="44" y2="34" stroke="#bdf3ff" stroke-width="2" stroke-linecap="round"/>`,
    pendulum: `
      <line x1="32" y1="8" x2="32" y2="34" stroke="#f7c948" stroke-width="3"/>
      <circle cx="32" cy="43" r="13" fill="#e85b35" stroke="#ffd873" stroke-width="3"/>
      <circle cx="32" cy="43" r="6" fill="#fff0b8"/>`,
    gear: `
      <circle cx="32" cy="32" r="16" fill="#d49526" stroke="#fff0b8" stroke-width="3" stroke-dasharray="6 4"/>
      <circle cx="32" cy="32" r="7" fill="#231b15" stroke="#f7c948" stroke-width="2.5"/>`,
    spark: `
      <polygon points="36,8 18,34 31,34 27,56 46,28 33,28" fill="#7be8ff" stroke="#f7c948" stroke-width="2.5"/>`,
    shield: `
      <path d="M16 14 L32 9 L48 14 L46 36 C44 46 32 55 32 55 C32 55 20 46 18 36 Z" fill="#d49526" stroke="#fff0b8" stroke-width="3"/>
      <path d="M32 16 L32 47" stroke="#231b15" stroke-width="3"/>`,
    flame: `
      <path d="M33 9 C42 20 47 28 45 40 C43 50 37 55 32 55 C23 55 18 47 19 37 C20 28 28 22 28 15 C31 18 33 13 33 9 Z" fill="#ff7838" stroke="#ffe17d" stroke-width="2.5"/>
      <circle cx="32" cy="41" r="6" fill="#fff4b8"/>`,
    prism: `
      <polygon points="32,10 53,48 11,48" fill="#34b3c7" stroke="#f7c948" stroke-width="3"/>
      <polygon points="32,21 43,43 21,43" fill="#b8f5ff"/>`,
    chalice: `
      <path d="M18 14 H46 L42 32 C40 38 35 41 32 41 C29 41 24 38 22 32 Z" fill="#5dd477" stroke="#f7c948" stroke-width="3"/>
      <rect x="29" y="41" width="6" height="10" fill="#f7c948"/>
      <rect x="21" y="50" width="22" height="5" rx="2" fill="#f7c948"/>`,
  };
  return `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">${shapes[glyph] || shapes.astrolabe}</svg>`;
}

export class RelicDraftManager {
  constructor() {
    this.collected = [];
  }

  reset() {
    this.collected = [];
  }

  rollOptions(rng = Math.random) {
    const ownedIds = new Set(this.collected.map((r) => r.id));
    const unowned = RELIC_CATALOG.filter((r) => !ownedIds.has(r.id));
    const pool = unowned.length >= 3 ? unowned : [...RELIC_CATALOG];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  }

  applyRelic(relic, player) {
    this.collected.push(relic);
    switch (relic.id) {
      case 'twin_astrolabe':
        player.extraBolts += 1;
        player.damageMult += 0.15;
        break;
      case 'mirrored_escapement':
        player.mirroredParry = true;
        player.dashCooldownMax = Math.max(0.65, player.dashCooldownMax * 0.75);
        break;
      case 'ignis_pendulum':
        player.ignisEveryThird = true;
        player.damageMult += 0.1;
        break;
      case 'chrono_mainspring':
        player.fireRate *= 1.26;
        player.baseSpeed *= 1.14;
        break;
      case 'voltaic_gearwheel':
        player.chainLightning += 2;
        break;
      case 'gilded_carapace':
        player.maxHp += 2;
        player.hp = Math.min(player.maxHp, player.hp + 2);
        player.carapaceShockwave = true;
        break;
      case 'brazier_conduit':
        player.novaCooldownMax = Math.max(2.0, player.novaCooldownMax * 0.65);
        player.novaCooldown = 0;
        break;
      case 'ricochet_prism':
        player.wallBounces += 1;
        player.boltSpeedMult += 0.2;
        break;
      case 'vampiric_sundial':
        player.vampiricKills = true;
        player.scoreMult += 0.25;
        break;
      default:
        break;
    }
  }
}
