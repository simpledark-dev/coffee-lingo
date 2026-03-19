// Character sprite sheet rendering.
// Each sheet has 4 directions in columns: right(0), up/back(1), left(2), down/front(3).
// Each cell is 16×32px (1 tile wide, 2 tiles tall).

export const CHARACTER_SHEETS = [
  '/Adam_idle_16x16.png',
  '/Alex_idle_16x16.png',
  '/Bob_idle_16x16.png',
  '/Amelia_idle_16x16.png',
];

// Column index per facing direction
const CHAR_DIR_COL: Record<string, number> = { right: 0, up: 1, left: 2, down: 3 };
const CHAR_SW = 16;  // source width per direction
const CHAR_SH = 32;  // source height (2 tiles tall)

export function preloadCharacterSheets(map: Map<string, HTMLImageElement>) {
  for (const src of CHARACTER_SHEETS) {
    if (map.has(src)) continue;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { map.set(src, img); };
    img.src = src;
  }
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  charSheetMap: Map<string, HTMLImageElement>,
  spriteVariant: number,
  facingDir: string,
  x: number,
  y: number,
  tilePx: number
) {
  const src = CHARACTER_SHEETS[spriteVariant % CHARACTER_SHEETS.length];
  const img = charSheetMap.get(src);
  if (!img) return;
  const col = CHAR_DIR_COL[facingDir] ?? 3;
  ctx.imageSmoothingEnabled = false;
  // Anchor bottom: draw from y - tilePx so feet land at y + tilePx
  ctx.drawImage(img, col * CHAR_SW, 0, CHAR_SW, CHAR_SH, x, y - tilePx, tilePx, tilePx * 2);
}
