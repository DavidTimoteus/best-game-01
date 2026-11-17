import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, GAME_PATH_MAX_BYTES, type DossierCaps } from './vendor/makefun-game.ts';

const ROOT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const ENTRY_CAPS: DossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: GAME_PATH_MAX_BYTES,
};

function validateSourceTree(rootPath: string): { gameDir: string; shotsDir: string } {
  const gameDir = join(rootPath, 'game');
  const entryHtml = join(gameDir, 'index.html');
  const shotsDir = join(rootPath, 'screenshots');

  if (!existsSync(entryHtml)) {
    throw new Error(`Missing playable entry document: ${entryHtml}`);
  }
  if (!existsSync(shotsDir)) {
    throw new Error(`Missing screenshots directory: ${shotsDir}`);
  }

  const shots = readdirSync(shotsDir)
    .filter((entry) => !entry.startsWith('.'))
    .sort();
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`Expected 3 or 4 screenshot files in ${shotsDir}, received ${shots.length}`);
  }

  for (const fileName of shots) {
    const size = statSync(join(shotsDir, fileName)).size;
    if (size > ENTRY_CAPS.screenshots.max_bytes) {
      throw new Error(`Screenshot ${fileName} exceeds limit (${size} bytes)`);
    }
  }

  return { gameDir, shotsDir };
}

function prepareOutputDirectory(targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });
  for (const item of readdirSync(targetDir).sort()) {
    rmSync(join(targetDir, item), { recursive: true, force: true });
  }
}

function copyTreeSorted(srcDir: string, dstDir: string): void {
  mkdirSync(dstDir, { recursive: true });
  const entries = readdirSync(srcDir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  );
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const srcPath = join(srcDir, entry.name);
    const dstPath = join(dstDir, entry.name);
    const info = lstatSync(srcPath);
    if (info.isDirectory()) {
      copyTreeSorted(srcPath, dstPath);
    } else if (info.isFile()) {
      copyFileSync(srcPath, dstPath);
    }
  }
}

function publishEntry(): void {
  const { gameDir, shotsDir } = validateSourceTree(ROOT_DIR);
  prepareOutputDirectory(OUTPUT_DIR);
  copyTreeSorted(gameDir, join(OUTPUT_DIR, 'game'));
  copyTreeSorted(shotsDir, join(OUTPUT_DIR, 'screenshots'));

  const dossierJson = buildDossier(OUTPUT_DIR, ENTRY_CAPS);
  if (dossierJson.length > 1_572_864) {
    throw new Error(`Dossier exceeds 1.5 MiB cap (${dossierJson.length} bytes)`);
  }
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossierJson);
}

publishEntry();
