// Grid Prism: Polarity Protocol - Main Entrypoint & Loop Orchestrator
import { FIXED_TIMESTEP, STATE_TITLE, STATE_PLAY, STATE_VICTORY, STATE_GAMEOVER } from './config.js';
import { InputManager } from './input.js';
import { World } from './world.js';
import { GameRenderer } from './render.js';
import { UIRenderer } from './ui.js';
import { stageShot } from './shots.js';
import { sound } from './audio.js';

const canvas = document.getElementById('game-canvas');
const renderer = new GameRenderer(canvas);
const input = new InputManager();
const world = new World();

input.attach(canvas);

// Check if launched in staged screenshot mode
const params = new URLSearchParams(window.location.search);
const shotMode = params.get('shot');

if (shotMode) {
  stageShot(shotMode, world);
  render(0);
  window.GAME_READY = true;
} else {
  // Live Interactive Loop
  let lastTime = performance.now();
  let accumulator = 0;
  let pulseTimer = 0;

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    accumulator += dt;
    pulseTimer += dt;

    // Handle Input in Current State
    if (world.state === STATE_TITLE) {
      if (input.justPressed('Space') || input.justPressed('Enter') || input.mouse.clicked) {
        sound.ensureContext();
        world.reset();
      }
    } else if (world.state === STATE_PLAY) {
      if (input.justPressed('KeyQ') || input.justPressed('ShiftLeft') || input.justPressed('ShiftRight')) {
        world.player.togglePolarity();
        sound.playSwitch(world.player.polarity);
      }
      if (input.justPressed('Space') || input.mouse.clicked) {
        if (world.player.triggerDash()) {
          sound.playDash();
        }
      }
    } else if (world.state === STATE_GAMEOVER || world.state === STATE_VICTORY) {
      if (input.justPressed('KeyR') || input.justPressed('Space') || input.mouse.clicked) {
        world.reset();
      }
    }

    // Fixed timestep update
    while (accumulator >= FIXED_TIMESTEP) {
      world.update(FIXED_TIMESTEP, input);
      accumulator -= FIXED_TIMESTEP;
    }

    input.clearFrame();
    render(pulseTimer);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

function render(pulse) {
  renderer.clear();
  renderer.drawGrid(FIXED_TIMESTEP);

  // Render game entities
  for (let i = 0; i < world.barriers.length; i++) {
    world.barriers[i].render(renderer.ctx);
  }
  for (let i = 0; i < world.nodes.length; i++) {
    world.nodes[i].render(renderer.ctx);
  }
  if (world.boss) {
    world.boss.render(renderer.ctx);
  }
  world.player.render(renderer.ctx);
  world.particles.render(renderer.ctx);

  // HUD
  if (world.state === STATE_PLAY) {
    renderer.drawHUD(world);
  }

  // UI Overlays
  if (world.state === STATE_TITLE) {
    UIRenderer.renderTitle(renderer.ctx, pulse);
  } else if (world.state === STATE_GAMEOVER) {
    UIRenderer.renderGameOver(renderer.ctx, world);
  } else if (world.state === STATE_VICTORY) {
    UIRenderer.renderVictory(renderer.ctx, world);
  }
}
