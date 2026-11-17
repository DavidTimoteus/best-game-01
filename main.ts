import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, GAME_PATH_MAX_BYTES, type DossierCaps } from './vendor/makefun-game.ts';

const ENTRY_ROOT = dirname(fileURLToPath(import.meta.url));
const STAGE_OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const COMPETITION_CAPS: DossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: GAME_PATH_MAX_BYTES,
};

function requireEntryAssets(rootDir: string): { gameRoot: string; shotsRoot: string } {
  const gameRoot = join(rootDir, 'game');
  const indexHtml = join(gameRoot, 'index.html');
  const shotsRoot = join(rootDir, 'screenshots');

  if (!existsSync(indexHtml)) {
    throw new Error(`Expected playable entry page at ${indexHtml}`);
  }
  if (!existsSync(shotsRoot)) {
    throw new Error(`Expected screenshots folder at ${shotsRoot}`);
  }

  const shotFiles = readdirSync(shotsRoot).filter((name) => !name.startsWith('.'));
  if (shotFiles.length < 3 || shotFiles.length > 4) {
    throw new Error(`Expected 3 or 4 screenshots in ${shotsRoot}, found ${shotFiles.length}`);
  }
  for (const shotName of shotFiles) {
    const shotSize = statSync(join(shotsRoot, shotName)).size;
    if (shotSize > COMPETITION_CAPS.screenshots.max_bytes) {
      throw new Error(`Screenshot ${shotName} exceeds ${COMPETITION_CAPS.screenshots.max_bytes} bytes (${shotSize})`);
    }
  }

  return { gameRoot, shotsRoot };
}

function resetOutputStage(targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });
  const existing = readdirSync(targetDir).sort();
  for (const item of existing) {
    rmSync(join(targetDir, item), { recursive: true, force: true });
  }
}

function mirrorSortedFiles(sourceDir: string, destDir: string): void {
  mkdirSync(destDir, { recursive: true });
  const items = readdirSync(sourceDir, { withFileTypes: true }).sort((left, right) => {
    if (left.name === right.name) return 0;
    return left.name < right.name ? -1 : 1;
  });
  for (const item of items) {
    if (item.name.startsWith('.')) continue;
    const fromPath = join(sourceDir, item.name);
    const toPath = join(destDir, item.name);
    const meta = lstatSync(fromPath);
    if (meta.isDirectory()) {
      mirrorSortedFiles(fromPath, toPath);
    } else if (meta.isFile()) {
      copyFileSync(fromPath, toPath);
    }
  }
}

function exportSubmissionOutput(): void {
  const { gameRoot, shotsRoot } = requireEntryAssets(ENTRY_ROOT);
  resetOutputStage(STAGE_OUTPUT_DIR);
  mirrorSortedFiles(gameRoot, join(STAGE_OUTPUT_DIR, 'game'));
  mirrorSortedFiles(shotsRoot, join(STAGE_OUTPUT_DIR, 'screenshots'));

  const dossierPayload = buildDossier(STAGE_OUTPUT_DIR, COMPETITION_CAPS);
  writeFileSync(join(STAGE_OUTPUT_DIR, 'dossier.json'), dossierPayload);
}

exportSubmissionOutput();
