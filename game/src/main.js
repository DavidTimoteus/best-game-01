/**
 * Application entry module: initializes canvas, fixed-step simulation loop,
 * audio/input wiring, clickable UI hitboxes, and deterministic shot staging.
 */

import { SoundEngine } from './audio.js';
import { ARENA_HEIGHT, ARENA_WIDTH, FIXED_DT, POLARITY } from './config.js';
import { InputController } from './input.js';
import { GameRenderer } from './render.js';
import { applyShotScene, getRequestedShot } from './shots.js';
import { HudOverlay } from './ui.js';
import { GameWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

canvas.width = ARENA_WIDTH;
canvas.height = ARENA_HEIGHT;

const sound = new SoundEngine();
const input = new InputController(canvas);
const world = new GameWorld(sound);
const renderer = new GameRenderer(ctx);
const hud = new HudOverlay();

const requestedShot = getRequestedShot();
if (requestedShot) {
  applyShotScene(world, requestedShot, input);
}

function pointInBox(pt, box) {
  return pt && box && pt.x >= box.x && pt.x <= box.x + box.w && pt.y >= box.y && pt.y <= box.y + box.h;
}

function handleUiInteractions() {
  const clickPt = input.consumeClick();
  if (clickPt) {
    sound.unlock();
  }

  if (input.consumePress('KeyM')) {
    sound.toggleMute();
  }
  if (input.consumePress('KeyC')) {
    input.autoFire = !input.autoFire;
  }

  if (world.state === 'title') {
    if (input.consumePress('Enter') || input.consumePress('Space') || pointInBox(clickPt, hud.hitboxes.startBtn)) {
      sound.unlock();
      world.reset('playing');
    }
    return;
  }

  if (world.state === 'draft') {
    if (input.consumePress('Digit1')) world.chooseUpgrade(0);
    else if (input.consumePress('Digit2')) world.chooseUpgrade(1);
    else if (input.consumePress('Digit3')) world.chooseUpgrade(2);
    else if (clickPt) {
      for (const card of hud.hitboxes.draftCards) {
        if (pointInBox(clickPt, card)) {
          world.chooseUpgrade(card.index);
          break;
        }
      }
    }
    return;
  }

  if (world.state === 'gameover' || world.state === 'victory') {
    if (input.consumePress('KeyR') || input.consumePress('Enter') || pointInBox(clickPt, hud.hitboxes.restartBtn)) {
      sound.unlock();
      world.reset('playing');
    }
    return;
  }

  if (input.consumePress('KeyR')) {
    world.reset('playing');
  }
}

let lastTime = performance.now();
let accumulator = 0;
let shotFramesRendered = 0;

function tick(now) {
  const rawDt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;

  if (!requestedShot) {
    handleUiInteractions();
    accumulator += rawDt;
    while (accumulator >= FIXED_DT) {
      const stepInput = {
        move: input.getMoveVector(),
        mouseX: input.mouseX,
        mouseY: input.mouseY,
        firing: input.mouseDown || input.autoFire || input.keys.has('KeyJ'),
        shift: input.consumeShift(),
        selectCyan: input.consumePress('Digit1'),
        selectAmber: input.consumePress('Digit2'),
        dash: input.consumePress('Space'),
        nova: input.consumePress('KeyF'),
      };
      world.step(FIXED_DT, stepInput);
      accumulator -= FIXED_DT;
    }
    input.endFrame();
  }

  renderer.render(world, input);
  hud.render(ctx, world, sound.muted);

  if (requestedShot && !window.__shotReady) {
    shotFramesRendered++;
    if (shotFramesRendered >= 2) {
      window.__shotReady = true;
    }
  }

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
