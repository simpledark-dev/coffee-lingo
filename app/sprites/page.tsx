'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PALETTE, SPRITE_MAP } from '@/src/lib/sprites';

function SpriteCanvas({ spriteKey }: { spriteKey: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const sprite = SPRITE_MAP[spriteKey];
    if (!sprite) return;
    const rows = sprite.length;
    const cols = sprite[0]?.length ?? 0;
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cols, rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = PALETTE[sprite[r][c]];
        if (!color || color === 'transparent') continue;
        ctx.fillStyle = color;
        ctx.fillRect(c, r, 1, 1);
      }
    }
  }, [spriteKey]);
  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated',
      }}
    />
  );
}

type HoverInfo = {
  row: number;
  col: number;
  index: number;
} | null;

type Rect = { x: number; y: number; w: number; h: number };

type AssetDef = {
  id: string;
  name: string;
  // Source selection in tiles (not pixels)
  rect: Rect;
  // Optional: export-friendly info (index of top-left + size)
  topLeftIndex: number;
  tileW: number;
  tileH: number;
  sheetSrc: string;
  sheetTileSize: number;
};

const STORAGE_KEY = 'coffee-lingo-tilesheet-assets-v1';

// Preset keys you can map directly into src/lib/tileset.ts (SPRITE_KEY_TO_TILE)
// Keep this list explicit so you don't have to type keys manually.
// NOTE: This list mirrors src/lib/sprites.ts SPRITE_MAP keys.
const PRESET_ASSET_KEYS: string[] = [
  // Floors
  'FLOOR_WOOD',
  'FLOOR_TILE',
  'FLOOR_HERRINGBONE',
  'FLOOR_MARBLE',
  // Interior
  'WALL',
  'WALL_1',
  'WALL_2',
  'WALL_3',
  'WALL_4',
  'WALL_5',
  'WALL_6',
  'COUNTER',
  'COUNTER_2',
  'COUNTER_3',
  'COUNTER_4',
  'COUNTER_5',
  'COUNTER_6',
  'COUNTER_L',
  'TABLE',
  'CHAIR',
  'SHELF',
  'SHELF_L',
  'SHELF_R',
  'MENU_BOARD',
  'DOOR',
  'COFFEE_MACHINE',
  'LAMP',
  'PLANT',
  'COFFEE_CUP',
  'WINDOW',
  'WINDOW_L',
  'WINDOW_R',
  'BOOKSHELF',
  'CHESS_TABLE',
  // Tiers / upgrades
  'BENCH_T1',
  'BENCH_T2',
  'PLANT_T1',
  'PLANT_T2',
  'LAMP_T1',
  'LAMP_T2',
  'CHAIR_T1',
  'CHAIR_T2',
  'TABLE_T1',
  'TABLE_T2',
  'SHELF_T1',
  'SHELF_T2',
  'COFFEE_MACHINE_T1',
  'COFFEE_MACHINE_T2',
  'COUNTER_TOP_T1',
  'COUNTER_TOP_T2',
  // Garden
  'GRASS',
  'HEDGE',
  'PATH_TILE',
  'FLOWER',
  'BENCH',
  'FOUNTAIN',
  'TREE',
  'LANTERN',
  'POND',
  // Outside
  'ROAD',
  'ROAD_LINE',
  'SIDEWALK',
  'SHOP_WALL',
  'SHOP_WALL_LIGHT',
  'AWNING_RED',
  'AWNING_BLUE',
  'AWNING_GREEN',
  'AWNING_BROWN',
  'SHOP_WINDOW',
  'LOCKED_DOOR',
  'CAFE_DOOR',
  'STREET_LAMP',
  'OUTDOOR_PLANT',
  'CURB',
  'CURB_R',
  'ROOF',
].sort((a, b) => a.localeCompare(b));

const KNOWN_SHEETS: { label: string; src: string; tileSize: number }[] = [
  { label: 'Interiors', src: '/Interiors_free_16x16.png', tileSize: 16 },
  { label: 'Room Builder', src: '/Room_Builder_free_16x16.png', tileSize: 16 },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function SpritesPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imgCacheVersion, setImgCacheVersion] = useState<number>(0);
  const dragRef = useRef<{
    dragging: boolean;
    start: { row: number; col: number } | null;
  }>({
    dragging: false,
    start: null,
  });

  const [src, setSrc] = useState<string>('/Interiors_free_16x16.png');
  const [tileW, setTileW] = useState<number>(16);
  const [tileH, setTileH] = useState<number>(16);
  const [zoom, setZoom] = useState<number>(3);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showNumbers, setShowNumbers] = useState<boolean>(true);
  const [hover, setHover] = useState<HoverInfo>(null);
  const [error, setError] = useState<string | null>(null);

  // Asset manager state
  const [assets, setAssets] = useState<AssetDef[]>([]);
  const [assetName, setAssetName] = useState<string>('TABLE');
  const [assetTilesW, setAssetTilesW] = useState<number>(2);
  const [assetTilesH, setAssetTilesH] = useState<number>(2);
  const [selected, setSelected] = useState<Rect | null>(null);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  const derived = useMemo(() => {
    const img = imgRef.current;
    const w = img?.naturalWidth ?? 0;
    const h = img?.naturalHeight ?? 0;
    const tw = Math.max(1, Math.floor(tileW || 1));
    const th = Math.max(1, Math.floor(tileH || 1));
    const cols = tw > 0 ? Math.floor(w / tw) : 0;
    const rows = th > 0 ? Math.floor(h / th) : 0;
    return { w, h, tw, th, cols, rows };
  }, [tileW, tileH, src]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      imgCacheRef.current.set(src, img);
      setImgCacheVersion((v) => v + 1);
      setError(null);
      draw();
    };
    img.onerror = () => {
      imgRef.current = null;
      setError('Could not load image. Try uploading a file or check the path.');
      draw();
    };
    img.src = src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    // Load from public JSON first (shared, file-based), then overlay localStorage (personal tweaks)
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/tilesheet-assets.json', {
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json();
          if (!alive) return;
          const firstSheet = Array.isArray(json?.sheets) ? json.sheets[0] : json?.sheet;
          const sheetSrc = firstSheet?.src;
          const sheetTileW = firstSheet?.tileW;
          const sheetTileH = firstSheet?.tileH;
          if (typeof sheetSrc === 'string' && sheetSrc) setSrc(sheetSrc);
          if (Number.isFinite(sheetTileW))
            setTileW(Math.max(1, Math.floor(sheetTileW)));
          if (Number.isFinite(sheetTileH))
            setTileH(Math.max(1, Math.floor(sheetTileH)));
          if (Array.isArray(json?.assets)) setAssets(json.assets);
        }
      } catch {
        // ignore missing/invalid JSON
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as AssetDef[];
        if (!alive) return;
        if (Array.isArray(parsed) && parsed.length > 0) setAssets(parsed);
      } catch {
        // ignore invalid storage
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
    } catch {
      // ignore storage failures
    }
  }, [assets]);

  // Preload images for all unique sheetSrc values in assets
  useEffect(() => {
    const srcs = [...new Set(assets.map((a) => a.sheetSrc).filter(Boolean))];
    let mounted = true;
    for (const sheetSrc of srcs) {
      if (imgCacheRef.current.has(sheetSrc)) continue;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!mounted) return;
        imgCacheRef.current.set(sheetSrc, img);
        setImgCacheVersion((v) => v + 1);
      };
      img.src = sheetSrc;
    }
    return () => {
      mounted = false;
    };
  }, [assets]);

  // When switching asset key, auto-load its saved selection (if exists)
  useEffect(() => {
    if (!assetName) return;
    const existing = assets.find((a) => a.name === assetName);
    if (!existing) {
      // If the active asset is a different key, detach activeAssetId so Save creates new entry
      if (activeAssetId) setActiveAssetId(null);
      return;
    }
    // Avoid loops: only load if not already active
    if (existing.id === activeAssetId) return;
    loadAsset(existing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetName, assets]);

  // On initial load (assets list available), auto-select the first saved asset
  useEffect(() => {
    if (activeAssetId) return;
    if (!assets || assets.length === 0) return;
    const first = assets[0];
    if (!first?.name) return;
    setAssetName(first.name);
    loadAsset(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileW, tileH, zoom, showGrid, showNumbers, hover, selected]);

  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = img?.naturalWidth ?? 0;
    const h = img?.naturalHeight ?? 0;

    const scale = clamp(zoom, 0.5, 20);
    const cssW = Math.max(1, Math.floor(w * scale));
    const cssH = Math.max(1, Math.floor(h * scale));

    const dpr =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    // Draw image
    if (img && w > 0 && h > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, cssW, cssH);
    } else {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.fillStyle = '#666';
      ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillText('No image', 12, 24);
    }

    const tw = Math.max(1, Math.floor(tileW || 1));
    const th = Math.max(1, Math.floor(tileH || 1));
    const stepX = tw * scale;
    const stepY = th * scale;

    // Grid
    if (showGrid && img && stepX > 0 && stepY > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;

      // Vertical lines
      for (let x = 0; x <= cssW; x += stepX) {
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, cssH);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= cssH; y += stepY) {
        ctx.beginPath();
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(cssW, Math.round(y) + 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Numbers
    if (showNumbers && img && stepX >= 8 && stepY >= 8) {
      const cols = Math.floor(w / tw);
      const rows = Math.floor(h / th);
      const fontSize = Math.max(8, Math.floor(Math.min(stepX, stepY) * 0.28));
      ctx.save();
      ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
      ctx.textBaseline = 'top';
      ctx.lineWidth = 3;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const index = r * cols + c;
          const x = c * stepX + 2;
          const y = r * stepY + 2;
          // Outline for contrast
          ctx.strokeStyle = 'rgba(0,0,0,0.75)';
          ctx.strokeText(String(index), x, y);
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.fillText(String(index), x, y);
        }
      }
      ctx.restore();
    }

    // Hover highlight
    if (hover && img) {
      const x = hover.col * stepX;
      const y = hover.row * stepY;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 200, 0, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.round(x) + 1,
        Math.round(y) + 1,
        Math.round(stepX) - 2,
        Math.round(stepY) - 2,
      );
      ctx.fillStyle = 'rgba(255, 200, 0, 0.18)';
      ctx.fillRect(
        Math.round(x),
        Math.round(y),
        Math.round(stepX),
        Math.round(stepY),
      );
      ctx.restore();
    }

    // Selected asset rectangle highlight
    if (selected && img) {
      const x = selected.x * stepX;
      const y = selected.y * stepY;
      const rw = selected.w * stepX;
      const rh = selected.h * stepY;
      ctx.save();
      ctx.strokeStyle = 'rgba(76, 175, 80, 0.95)';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        Math.round(x) + 1.5,
        Math.round(y) + 1.5,
        Math.round(rw) - 3,
        Math.round(rh) - 3,
      );
      ctx.fillStyle = 'rgba(76, 175, 80, 0.16)';
      ctx.fillRect(
        Math.round(x),
        Math.round(y),
        Math.round(rw),
        Math.round(rh),
      );
      ctx.restore();
    }
  }

  function getCellFromEvent(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return null;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scale = clamp(zoom, 0.5, 20);
    const tw = Math.max(1, Math.floor(tileW || 1));
    const th = Math.max(1, Math.floor(tileH || 1));
    const stepX = tw * scale;
    const stepY = th * scale;

    const cols = Math.floor((img.naturalWidth ?? 0) / tw);
    const rows = Math.floor((img.naturalHeight ?? 0) / th);
    const col = Math.floor(x / stepX);
    const row = Math.floor(y / stepY);

    if (col < 0 || row < 0 || col >= cols || row >= rows) {
      return null;
    }

    return { row, col, cols, rows };
  }

  function rectFromCells(
    a: { row: number; col: number },
    b: { row: number; col: number },
    cols: number,
    rows: number,
  ): Rect {
    const x1 = clamp(Math.min(a.col, b.col), 0, cols - 1);
    const y1 = clamp(Math.min(a.row, b.row), 0, rows - 1);
    const x2 = clamp(Math.max(a.col, b.col), 0, cols - 1);
    const y2 = clamp(Math.max(a.row, b.row), 0, rows - 1);
    return { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1 };
  }

  function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const cell = getCellFromEvent(e);
    const img = imgRef.current;
    if (!cell || !img) {
      setHover(null);
      return;
    }
    const tw = Math.max(1, Math.floor(tileW || 1));
    const cols = Math.floor((img.naturalWidth ?? 0) / tw);
    const index = cell.row * cols + cell.col;
    setHover({ row: cell.row, col: cell.col, index });

    const d = dragRef.current;
    if (d.dragging && d.start) {
      setSelected(
        rectFromCells(
          d.start,
          { row: cell.row, col: cell.col },
          cell.cols,
          cell.rows,
        ),
      );
    }
  }

  function onDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const cell = getCellFromEvent(e);
    if (!cell) return;
    dragRef.current.dragging = true;
    dragRef.current.start = { row: cell.row, col: cell.col };
    setSelected({ x: cell.col, y: cell.row, w: 1, h: 1 });
  }

  function onUp(e: React.MouseEvent<HTMLCanvasElement>) {
    const cell = getCellFromEvent(e);
    const d = dragRef.current;
    if (!d.dragging || !d.start) {
      d.dragging = false;
      d.start = null;
      return;
    }
    d.dragging = false;
    if (!cell) {
      d.start = null;
      return;
    }
    setSelected(
      rectFromCells(
        d.start,
        { row: cell.row, col: cell.col },
        cell.cols,
        cell.rows,
      ),
    );
    d.start = null;
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied!');
      setTimeout(() => setStatus(''), 900);
    } catch {
      setStatus('Copy failed (browser permission).');
      setTimeout(() => setStatus(''), 1200);
    }
  }

  function syncEditorSizeFromSelection(r: Rect | null) {
    if (!r) return;
    setAssetTilesW(r.w);
    setAssetTilesH(r.h);
  }

  function makeId() {
    // Simple id: avoid heavy deps
    return `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  function addOrUpdateAssetFromSelection() {
    const img = imgRef.current;
    if (!img || !selected) return;
    const tw = Math.max(1, Math.floor(tileW || 1));
    const cols = Math.floor((img.naturalWidth ?? 0) / tw);
    const topLeftIndex = selected.y * cols + selected.x;
    const payload: AssetDef = {
      id: activeAssetId ?? makeId(),
      name: (assetName || 'ASSET').trim(),
      rect: selected,
      topLeftIndex,
      tileW: selected.w,
      tileH: selected.h,
      sheetSrc: src,
      sheetTileSize: tw,
    };

    setAssets((prev) => {
      const existingIdx = activeAssetId
        ? prev.findIndex((a) => a.id === activeAssetId)
        : -1;
      if (existingIdx >= 0) {
        const next = prev.slice();
        next[existingIdx] = payload;
        return next;
      }
      return [payload, ...prev];
    });
    setActiveAssetId(payload.id);
    setStatus('Asset saved.');
    setTimeout(() => setStatus(''), 900);
  }

  function deleteActiveAsset() {
    if (!activeAssetId) return;
    setAssets((prev) => prev.filter((a) => a.id !== activeAssetId));
    setActiveAssetId(null);
    setStatus('Asset deleted.');
    setTimeout(() => setStatus(''), 900);
  }

  function loadAsset(a: AssetDef) {
    setActiveAssetId(a.id);
    setAssetName(a.name);
    setAssetTilesW(a.tileW);
    setAssetTilesH(a.tileH);
    // If sheet differs, swap sheet first; selection will be used once image loads
    if (a.sheetSrc && a.sheetSrc !== src) setSrc(a.sheetSrc);
    setSelected(a.rect);
    syncEditorSizeFromSelection(a.rect);
  }

  function buildExportData() {
    const seenSrcs = new Set<string>();
    const sheets: { src: string; tileW: number; tileH: number }[] = [];
    for (const a of assets) {
      if (a.sheetSrc && !seenSrcs.has(a.sheetSrc)) {
        seenSrcs.add(a.sheetSrc);
        sheets.push({ src: a.sheetSrc, tileW: a.sheetTileSize, tileH: a.sheetTileSize });
      }
    }
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      sheets,
      assets,
    };
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(buildExportData(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tilesheet-assets.json';
    a.click();
    URL.revokeObjectURL(url);
    setStatus('JSON exported.');
    setTimeout(() => setStatus(''), 1800);
  }

  async function copyJson() {
    await copyText(JSON.stringify(buildExportData(), null, 2));
  }

  async function onClick() {
    if (!hover) return;
    await copyText(`${hover.index} (row=${hover.row}, col=${hover.col})`);
  }

  const preview = (() => {
    if (!selected || !imgRef.current) return null;
    const tw = Math.max(1, Math.floor(tileW || 1));
    const th = Math.max(1, Math.floor(tileH || 1));
    const sx = selected.x * tw;
    const sy = selected.y * th;
    const sw = selected.w * tw;
    const sh = selected.h * th;
    return { sx, sy, sw, sh };
  })();

  const assetsByName = useMemo(() => {
    const map = new Map<string, AssetDef>();
    for (const a of assets) map.set(a.name, a);
    return map;
  }, [assets]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        overflow: 'hidden',
        background: 'var(--bg-outer)',
      }}
    >
      {/* Left: tilesheet */}
      <div
        style={{
          flex: '1 1 auto',
          minWidth: 520,
          background: 'var(--bg-container)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: 12,
            background: 'var(--bg-warm)',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontWeight: 1000, color: 'var(--brown-dark)' }}>
            Tilesheet
          </div>
          <Link
            href="/"
            style={{
              color: 'var(--brown-dark)',
              fontWeight: 900,
              textDecoration: 'none',
            }}
          >
            ← Back
          </Link>

          <select
            value={src}
            onChange={(e) => {
              const sheet = KNOWN_SHEETS.find((s) => s.src === e.target.value);
              if (sheet) {
                setSrc(sheet.src);
                setTileW(sheet.tileSize);
                setTileH(sheet.tileSize);
              }
            }}
            style={{
              padding: '8px 10px',
              borderRadius: 10,
              border: '2px solid var(--brown-light)',
              background: 'var(--cream)',
              fontWeight: 900,
              minHeight: 40,
              cursor: 'pointer',
            }}
          >
            {KNOWN_SHEETS.map((s) => (
              <option key={s.src} value={s.src}>
                {s.label}
              </option>
            ))}
          </select>

          <label
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{ fontWeight: 900, color: 'var(--brown-dark)' }}>
              Tile
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={tileW}
              min={1}
              onChange={(e) =>
                setTileW(Math.max(1, Number(e.target.value) || 1))
              }
              style={{
                width: 72,
                padding: '8px 10px',
                borderRadius: 10,
                border: '2px solid var(--brown-light)',
                background: 'var(--cream)',
                fontWeight: 900,
                minHeight: 40,
              }}
            />
            <span style={{ fontWeight: 900, color: 'var(--brown-dark)' }}>
              ×
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={tileH}
              min={1}
              onChange={(e) =>
                setTileH(Math.max(1, Number(e.target.value) || 1))
              }
              style={{
                width: 72,
                padding: '8px 10px',
                borderRadius: 10,
                border: '2px solid var(--brown-light)',
                background: 'var(--cream)',
                fontWeight: 900,
                minHeight: 40,
              }}
            />
          </label>

          <label
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <span style={{ fontWeight: 900, color: 'var(--brown-dark)' }}>
              Zoom
            </span>
            <input
              type="range"
              min={1}
              max={16}
              step={0.5}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ width: 160 }}
            />
            <span
              style={{
                width: 48,
                textAlign: 'right',
                fontWeight: 900,
                color: 'var(--brown-dark)',
              }}
            >
              {zoom}x
            </span>
          </label>

          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 10,
              border: '2px solid var(--brown-light)',
              background: 'var(--cream)',
              cursor: 'pointer',
              minHeight: 40,
            }}
          >
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            <span style={{ fontWeight: 900, color: 'var(--text-dark)' }}>
              Grid
            </span>
          </label>

          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 10,
              border: '2px solid var(--brown-light)',
              background: 'var(--cream)',
              cursor: 'pointer',
              minHeight: 40,
            }}
          >
            <input
              type="checkbox"
              checked={showNumbers}
              onChange={(e) => setShowNumbers(e.target.checked)}
            />
            <span style={{ fontWeight: 900, color: 'var(--text-dark)' }}>
              Number
            </span>
          </label>
        </div>

        {error ? (
          <div
            style={{
              margin: 12,
              padding: 10,
              borderRadius: 12,
              background: '#ffebee',
              border: '1px solid rgba(0,0,0,0.08)',
              color: '#8a1f1f',
              fontWeight: 800,
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          <div
            style={{
              display: 'inline-block',
              background: 'var(--cream)',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.12)',
              padding: 12,
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseMove={onMove}
              onMouseLeave={() => setHover(null)}
              onMouseDown={onDown}
              onMouseUp={onUp}
              onClick={onClick}
              style={{ display: 'block', cursor: 'crosshair' }}
            />
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--text-medium)',
            }}
          >
            Image:{' '}
            <span style={{ color: 'var(--text-dark)' }}>
              {derived.w}×{derived.h}px
            </span>{' '}
            · Grid:{' '}
            <span style={{ color: 'var(--text-dark)' }}>
              {derived.cols}×{derived.rows}
            </span>{' '}
            · Hover:{' '}
            <span style={{ color: 'var(--text-dark)' }}>
              {hover ? `${hover.index} (r=${hover.row}, c=${hover.col})` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: editor */}
      <div
        style={{
          width: 460,
          minWidth: 360,
          maxWidth: '46vw',
          background: 'var(--cream)',
          borderLeft: '1px solid rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: 14,
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            background: 'var(--bg-warm)',
          }}
        >
          <div
            style={{
              fontWeight: 1000,
              color: 'var(--brown-dark)',
              fontSize: 18,
            }}
          >
            Editor
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--text-medium)',
            }}
          >
            Drag tilesheet to select area. Save to save asset. Export to
            download to download JSON.
          </div>
        </div>

        <div
          style={{
            padding: 14,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 1000, color: 'var(--brown-dark)' }}>
                Asset key
              </span>
              <select
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                style={{
                  padding: '10px 10px',
                  borderRadius: 12,
                  border: '2px solid var(--brown-light)',
                  background: 'var(--bg-container)',
                  fontWeight: 900,
                  minHeight: 44,
                }}
              >
                {PRESET_ASSET_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <label
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <span style={{ fontWeight: 1000, color: 'var(--brown-dark)' }}>
                  W
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={assetTilesW}
                  min={1}
                  onChange={(e) =>
                    setAssetTilesW(Math.max(1, Number(e.target.value) || 1))
                  }
                  style={{
                    width: 86,
                    padding: '10px 10px',
                    borderRadius: 12,
                    border: '2px solid var(--brown-light)',
                    background: 'var(--bg-container)',
                    fontWeight: 900,
                    minHeight: 44,
                  }}
                />
              </label>
              <label
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <span style={{ fontWeight: 1000, color: 'var(--brown-dark)' }}>
                  H
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={assetTilesH}
                  min={1}
                  onChange={(e) =>
                    setAssetTilesH(Math.max(1, Number(e.target.value) || 1))
                  }
                  style={{
                    width: 86,
                    padding: '10px 10px',
                    borderRadius: 12,
                    border: '2px solid var(--brown-light)',
                    background: 'var(--bg-container)',
                    fontWeight: 900,
                    minHeight: 44,
                  }}
                />
              </label>
              <button
                onClick={() => {
                  // When user changes W/H, keep current top-left but resize selection
                  if (!selected) return;
                  const img = imgRef.current;
                  const tw = Math.max(1, Math.floor(tileW || 1));
                  const cols = Math.floor((img?.naturalWidth ?? 0) / tw);
                  const rows = Math.floor((img?.naturalHeight ?? 0) / tw);
                  const next: Rect = {
                    x: clamp(selected.x, 0, Math.max(0, cols - assetTilesW)),
                    y: clamp(selected.y, 0, Math.max(0, rows - assetTilesH)),
                    w: Math.max(1, Math.floor(assetTilesW || 1)),
                    h: Math.max(1, Math.floor(assetTilesH || 1)),
                  };
                  setSelected(next);
                }}
                disabled={!selected}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '2px solid var(--brown-light)',
                  background: selected
                    ? 'var(--bg-warm)'
                    : 'rgba(237,224,212,0.6)',
                  fontWeight: 1000,
                  cursor: selected ? 'pointer' : 'default',
                  minHeight: 44,
                }}
              >
                Resize selection
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={addOrUpdateAssetFromSelection}
              disabled={!selected}
              style={{
                flex: '1 1 auto',
                padding: '12px 12px',
                borderRadius: 12,
                border: '2px solid var(--brown-light)',
                background: selected
                  ? 'var(--brown-dark)'
                  : 'rgba(92,61,46,0.35)',
                fontWeight: 1000,
                cursor: selected ? 'pointer' : 'default',
                minHeight: 46,
                color: 'var(--cream)',
              }}
            >
              {activeAssetId ? 'Update' : 'Save'}
            </button>

            <button
              onClick={deleteActiveAsset}
              disabled={!activeAssetId}
              style={{
                padding: '12px 12px',
                borderRadius: 12,
                border: '2px solid rgba(231, 76, 60, 0.6)',
                background: activeAssetId ? '#ffebee' : 'rgba(255,235,238,0.6)',
                fontWeight: 1000,
                cursor: activeAssetId ? 'pointer' : 'default',
                minHeight: 46,
                color: '#7a1d1d',
              }}
            >
              Delete
            </button>

            <button
              onClick={exportJson}
              style={{
                padding: '12px 12px',
                borderRadius: 12,
                border: '2px solid var(--brown-light)',
                background: 'var(--bg-warm)',
                fontWeight: 1000,
                cursor: 'pointer',
                minHeight: 46,
              }}
            >
              Export
            </button>

            <button
              onClick={copyJson}
              style={{
                padding: '12px 12px',
                borderRadius: 12,
                border: '2px solid var(--brown-light)',
                background: 'var(--bg-warm)',
                fontWeight: 1000,
                cursor: 'pointer',
                minHeight: 46,
              }}
            >
              Copy JSON
            </button>
          </div>

          <div
            style={{
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'var(--bg-container)',
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 1000, color: 'var(--brown-dark)' }}>
              Selection
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                fontWeight: 900,
                color: 'var(--text-medium)',
              }}
            >
              {selected
                ? `r=${selected.y} c=${selected.x} · ${selected.w}×${selected.h} tiles`
                : 'No area selected.'}
            </div>
            {selected ? (
              <button
                onClick={async () => {
                  const img = imgRef.current;
                  const tw = Math.max(1, Math.floor(tileW || 1));
                  const cols = Math.floor((img?.naturalWidth ?? 0) / tw);
                  const idx = selected.y * cols + selected.x;
                  await copyText(
                    `${idx} (row=${selected.y}, col=${selected.x}, w=${selected.w}, h=${selected.h})`,
                  );
                }}
                style={{
                  marginTop: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '2px solid var(--brown-light)',
                  background: 'var(--cream)',
                  fontWeight: 1000,
                  cursor: 'pointer',
                  minHeight: 44,
                }}
              >
                Copy top-left index
              </button>
            ) : null}
          </div>

          <div
            style={{
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'var(--bg-container)',
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 1000, color: 'var(--brown-dark)' }}>
              Preview
            </div>
            {!selected || !preview || !imgRef.current ? (
              <div
                style={{
                  marginTop: 6,
                  color: 'var(--text-medium)',
                  fontWeight: 900,
                }}
              >
                No area selected.
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    display: 'inline-block',
                    borderRadius: 10,
                    border: '1px solid rgba(0,0,0,0.18)',
                    background: '#000',
                  }}
                >
                  <div
                    style={{
                      width: preview.sw * 3,
                      height: preview.sh * 3,
                      backgroundImage: `url(${src})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: `${imgRef.current!.naturalWidth * 3}px ${
                        imgRef.current!.naturalHeight * 3
                      }px`,
                      backgroundPosition: `-${preview.sx * 3}px -${
                        preview.sy * 3
                      }px`,
                      imageRendering: 'pixelated',
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    fontWeight: 900,
                    color: 'var(--text-medium)',
                  }}
                >
                  srcPx=({preview.sx},{preview.sy}) sizePx=({preview.sw}×
                  {preview.sh})
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'var(--bg-container)',
              padding: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 1000, color: 'var(--brown-dark)' }}>
                Assets
              </div>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem(STORAGE_KEY);
                  } catch {
                    // ignore
                  }
                  setAssets([]);
                  setActiveAssetId(null);
                  setSelected(null);
                  setStatus('Asset list reset.');
                  setTimeout(() => setStatus(''), 900);
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '2px solid rgba(231, 76, 60, 0.6)',
                  background: '#ffebee',
                  fontWeight: 1000,
                  cursor: 'pointer',
                  minHeight: 40,
                  color: '#7a1d1d',
                }}
              >
                Reset
              </button>
            </div>
            <div
              style={{
                marginTop: 10,
                maxHeight: 320,
                overflow: 'auto',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.08)',
                background: 'var(--cream)',
              }}
            >
              {assets.length === 0 ? (
                <div
                  style={{
                    padding: 12,
                    color: 'var(--text-medium)',
                    fontWeight: 900,
                  }}
                >
                  No assets yet.
                </div>
              ) : (
                assets.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => loadAsset(a)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 10,
                      border: 'none',
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                      background:
                        a.id === activeAssetId
                          ? 'rgba(212,168,67,0.18)'
                          : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{ fontWeight: 1000, color: 'var(--text-dark)' }}
                    >
                      {a.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: 'var(--text-medium)',
                      }}
                    >
                      idx={a.topLeftIndex} · r={a.rect.y} c={a.rect.x} ·{' '}
                      {a.tileW}×{a.tileH}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: assets quick pick */}
      <div
        data-cache-v={imgCacheVersion}
        style={{
          width: 400,
          minWidth: 360,
          maxWidth: '34vw',
          background: 'var(--cream)',
          borderLeft: '1px solid rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: 14,
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            background: 'var(--bg-warm)',
          }}
        >
          <div
            style={{
              fontWeight: 1000,
              color: 'var(--brown-dark)',
              fontSize: 18,
            }}
          >
            Assets
          </div>
        </div>

        <div
          style={{
            padding: 14,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
            }}
          >
            {PRESET_ASSET_KEYS.map((k) => {
              const a = assetsByName.get(k);
              const tw = a
                ? Math.max(1, a.sheetTileSize || 16)
                : Math.max(1, Math.floor(tileW || 1));
              const th = tw;
              const sheetSrc = a?.sheetSrc || src;
              const cachedImg = imgCacheRef.current.get(sheetSrc);
              const bgSize = cachedImg
                ? `${cachedImg.naturalWidth * 2}px ${cachedImg.naturalHeight * 2}px`
                : '0 0';
              const sx = a ? a.rect.x * tw : 0;
              const sy = a ? a.rect.y * th : 0;
              const sw = a ? a.rect.w * tw : tw;
              const sh = a ? a.rect.h * th : th;
              const thumbW = Math.max(24, Math.min(96, sw * 2));
              const thumbH = Math.max(24, Math.min(96, sh * 2));
              const isActive = assetName === k;
              return (
                <button
                  key={k}
                  onClick={() => {
                    setAssetName(k);
                    const existing = assetsByName.get(k);
                    if (existing) {
                      loadAsset(existing);
                    } else {
                      // Keep current selection/preview; only detach active id so Save creates new entry
                      setActiveAssetId(null);
                    }
                  }}
                  style={{
                    borderRadius: 12,
                    border: isActive
                      ? '2px solid var(--brown-dark)'
                      : '1px solid rgba(0,0,0,0.12)',
                    background: isActive
                      ? 'rgba(212,168,67,0.18)'
                      : 'var(--cream)',
                    padding: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        border: '1px solid rgba(0,0,0,0.18)',
                        background: '#000',
                        overflow: 'hidden',
                        flexShrink: 0,
                        position: 'relative',
                      }}
                    >
                      {a ? (
                        <div
                          style={{
                            width: thumbW,
                            height: thumbH,
                            backgroundImage: `url(${sheetSrc})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: bgSize,
                            backgroundPosition: `-${sx * 2}px -${sy * 2}px`,
                            imageRendering: 'pixelated',
                            transform: 'scale(0.5)',
                            transformOrigin: 'top left',
                          }}
                        />
                      ) : (
                        <SpriteCanvas spriteKey={k} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 1000,
                          color: 'var(--text-dark)',
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {k}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          color: 'var(--text-medium)',
                        }}
                      >
                        {a
                          ? `idx=${a.topLeftIndex} · ${a.tileW}×${a.tileH}`
                          : 'not set'}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Toast */}
      {status ? (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            padding: '12px 18px',
            borderRadius: 14,
            background: 'var(--brown-dark)',
            color: 'var(--cream)',
            fontWeight: 1000,
            fontSize: 14,
            boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          {status}
        </div>
      ) : null}
    </div>
  );
}
