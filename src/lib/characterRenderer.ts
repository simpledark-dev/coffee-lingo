// Character sprite sheet rendering.
// Both idle_anim and run sheets share the same layout:
//   4 directions × 6 frames in a single row. Each cell 16×32px.
//   sx = (dirCol * ANIM_FRAMES + frame) * 16

const IDLE_SHEETS = [
  '/characters/Adam_idle_anim_16x16.png',
  '/characters/Alex_idle_anim_16x16.png',
  '/characters/Bob_idle_anim_16x16.png',
  '/characters/Amelia_idle_anim_16x16.png',
];

const RUN_SHEETS = [
  '/characters/Adam_run_16x16.png',
  '/characters/Alex_run_16x16.png',
  '/characters/Bob_run_16x16.png',
  '/characters/Amelia_run_16x16.png',
];

/** All sheet paths — preload all of them */
export const CHARACTER_SHEETS = [...IDLE_SHEETS, ...RUN_SHEETS];

export const ANIM_FRAMES = 6;
/** Divide game tick by this to get animation frame index (~6 fps at 60fps loop) */
export const ANIM_FRAME_SPEED = 10;

// Column index per facing direction
const CHAR_DIR_COL: Record<string, number> = { right: 0, up: 1, left: 2, down: 3 };
const CHAR_SW = 16;
const CHAR_SH = 32;  // 2 tiles tall

/** Returns the idle anim sheet path for a given spriteVariant */
export function getIdleSheetSrc(spriteVariant: number): string {
  return IDLE_SHEETS[spriteVariant % IDLE_SHEETS.length];
}

export function preloadCharacterSheets(map: Map<string, HTMLImageElement>) {
  for (const src of CHARACTER_SHEETS) {
    if (map.has(src)) continue;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { map.set(src, img); };
    img.src = src;
  }
}

/**
 * Draw a character sprite.
 * @param animFrame - animation frame 0–5
 * @param run - true = run sheet, false = idle anim sheet
 */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  charSheetMap: Map<string, HTMLImageElement>,
  spriteVariant: number,
  facingDir: string,
  x: number,
  y: number,
  tilePx: number,
  animFrame: number,
  run: boolean,
) {
  const idx = spriteVariant % IDLE_SHEETS.length;
  const src = run ? RUN_SHEETS[idx] : IDLE_SHEETS[idx];
  const img = charSheetMap.get(src);
  if (!img) return;

  const dirCol = CHAR_DIR_COL[facingDir] ?? 3;
  const sx = (dirCol * ANIM_FRAMES + (animFrame % ANIM_FRAMES)) * CHAR_SW;

  ctx.imageSmoothingEnabled = false;
  // Anchor bottom: feet land at y + tilePx
  ctx.drawImage(img, sx, 0, CHAR_SW, CHAR_SH, x, y - tilePx, tilePx, tilePx * 2);
}
