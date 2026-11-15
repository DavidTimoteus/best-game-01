// Deterministic Screenshot Stager for Automated Evaluation
import {
  STATE_TITLE,
  STATE_PLAY,
  STATE_GAMEOVER,
  POLARITY_CYAN,
  POLARITY_AMBER,
  VIEW_WIDTH,
  VIEW_HEIGHT,
} from './config.js';
import { EnergyNode, HazardBarrier, SingularityNexusBoss } from './entities.js';

export function stageShot(name, world) {
  world.reset();

  if (name === 'start' || name === 'title') {
    world.state = STATE_TITLE;
    world.player.x = VIEW_WIDTH / 2;
    world.player.y = VIEW_HEIGHT / 2 + 150;
    // Ambient floating particles
    world.particles.emit(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 90, 40, '#00f0ff', 90, 2);
    return;
  }

  if (name === 'combat' || name === 'play') {
    world.state = STATE_PLAY;
    world.sector = 2;
    world.player.x = 520;
    world.player.y = 360;
    world.player.polarity = POLARITY_CYAN;
    world.player.shield = 84;
    world.player.score = 9600;
    world.player.combo = 5;
    world.player.isDashing = true;
    world.player.dashTimer = 0.12;

    // Rich field of nodes & hazard barriers
    world.nodes = [
      new EnergyNode(480, 360, POLARITY_CYAN, 0, 0),
      new EnergyNode(590, 320, POLARITY_CYAN, 20, -10),
      new EnergyNode(420, 260, POLARITY_AMBER, -30, 20),
      new EnergyNode(720, 420, POLARITY_AMBER, 15, 15),
      new EnergyNode(360, 480, POLARITY_CYAN, -20, -10),
      new EnergyNode(820, 280, POLARITY_AMBER, -10, 30),
    ];

    world.barriers = [
      new HazardBarrier(640, 240, 0.4, 180, POLARITY_CYAN, 0),
      new HazardBarrier(720, 500, -0.6, 180, POLARITY_AMBER, 0),
    ];

    world.particles.emit(520, 360, 25, '#00f0ff', 160, 0.5);
    world.particles.emit(480, 360, 20, '#ffffff', 200, 0.4);
    return;
  }

  if (name === 'boss') {
    world.state = STATE_PLAY;
    world.sector = 4;
    world.player.x = 340;
    world.player.y = 360;
    world.player.polarity = POLARITY_AMBER;
    world.player.shield = 68;
    world.player.score = 24500;
    world.player.combo = 8;
    world.player.isDashing = true;

    world.boss = new SingularityNexusBoss(VIEW_WIDTH / 2 + 100, VIEW_HEIGHT / 2);
    world.boss.shield = 65;

    world.nodes = [
      new EnergyNode(540, 260, POLARITY_AMBER, -15, 10),
      new EnergyNode(540, 460, POLARITY_CYAN, 10, -15),
      new EnergyNode(740, 260, POLARITY_CYAN, 20, 10),
      new EnergyNode(740, 460, POLARITY_AMBER, -10, -20),
    ];

    world.particles.emitShockwave(world.boss.x, world.boss.y, '#ffaa00');
    world.particles.emit(world.player.x, world.player.y, 30, '#00f0ff', 180, 0.6);
    return;
  }

  if (name === 'end' || name === 'gameover') {
    world.state = STATE_GAMEOVER;
    world.sector = 3;
    world.player.score = 18400;
    world.player.absorbedCount = 62;
    world.survivalTime = 46.8;
    return;
  }
}
