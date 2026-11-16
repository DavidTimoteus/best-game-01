import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, GAME_PATH_MAX_BYTES, type DossierCaps } from './vendor/makefun-game.ts';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const GATE_CAPS: DossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: GAME_PATH_MAX_BYTES,
};

function assertSourceTreePresent(path: string, label: string): void {
  if (!existsSync(path)) {
    throw new Error(`Missing required ${label} directory at ${path}`);
  }
}

function clearDirectoryChildren(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

function copyTreeDeterministic(src: string, dst: string): void {
  mkdirSync(dst, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  );
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);
    const st = lstatSync(srcPath);
    if (st.isDirectory()) {
      copyTreeDeterministic(srcPath, dstPath);
    } else if (st.isFile()) {
      copyFileSync(srcPath, dstPath);
    }
  }
}

const gameSrc = join(ROOT, 'game');
const shotsSrc = join(ROOT, 'screenshots');
assertSourceTreePresent(gameSrc, 'game');
assertSourceTreePresent(shotsSrc, 'screenshots');

clearDirectoryChildren(OUT_DIR);
copyTreeDeterministic(gameSrc, join(OUT_DIR, 'game'));
copyTreeDeterministic(shotsSrc, join(OUT_DIR, 'screenshots'));

const dossierBytes = buildDossier(OUT_DIR, GATE_CAPS);
writeFileSync(join(OUT_DIR, 'dossier.json'), dossierBytes);
