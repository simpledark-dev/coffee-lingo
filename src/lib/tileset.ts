// Tileset support (PNG atlas slicing). Keep comments in English per project convention.

export const TILESET_ENABLED = true;

export type TilesetAnchor = 'top-left' | 'bottom-left';

export type TilesetAsset = {
  // Index of the top-left tile in the atlas
  index: number;
  // Size in tiles
  w: number;
  h: number;
  // Where to anchor the asset when drawing at a tile position
  // - bottom-left is useful for tall objects that stand on the floor (e.g. lamp 1x2)
  anchor?: TilesetAnchor;
  // Which tilesheet image this asset comes from
  sheetSrc?: string;
};

/**
 * Map existing sprite keys (used by CafeCanvas) to tilesheet assets.
 *
 * Indexing is row-major:
 * - columns = floor(imageWidth / sheetTileSize)
 * - index = row * columns + col
 *
 * Use the /sprites viewer page to read the index number, then put it here.
 *
 * Example:
 *   FLOOR_WOOD: 123, // 1x1 tile
 *   LAMP: { index: 926, w: 1, h: 2, anchor: 'bottom-left' }, // 1x2 tile
 */
export const SPRITE_KEY_TO_TILE: Partial<
  Record<string, number | TilesetAsset>
> = {
  // Fill this gradually as you replace procedural sprites with PNG tiles.
  // Example from your export:
  // LAMP: { index: 926, w: 1, h: 2, anchor: 'bottom-left' },
};

export type TilesheetAssetsExportV1 = {
  version: 1;
  exportedAt?: string;
  // Multi-sheet format (new). Legacy single-sheet format kept for backward compat.
  sheets?: Array<{ src: string; tileW: number; tileH: number }>;
  sheet?: { src?: string; tileW?: number; tileH?: number };
  assets: Array<{
    id?: string;
    name: string;
    rect?: { x: number; y: number; w: number; h: number };
    topLeftIndex: number;
    tileW?: number;
    tileH?: number;
    sheetSrc?: string;
    sheetTileSize?: number;
  }>;
};

export function buildSpriteKeyToTileFromExport(
  data: TilesheetAssetsExportV1,
): Record<string, TilesetAsset> {
  const out: Record<string, TilesetAsset> = {};
  if (!data || data.version !== 1 || !Array.isArray(data.assets)) return out;

  for (const a of data.assets) {
    if (!a?.name) continue;
    const w = Math.max(1, Math.floor(a.tileW ?? a.rect?.w ?? 1));
    const h = Math.max(1, Math.floor(a.tileH ?? a.rect?.h ?? 1));
    const idx = a.topLeftIndex;
    if (!Number.isFinite(idx) || idx < 0) continue;

    out[a.name] = {
      index: idx,
      w,
      h,
      anchor: h > 1 ? 'bottom-left' : 'top-left',
      sheetSrc: a.sheetSrc,
    };
  }

  return out;
}
