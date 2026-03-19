 'use client'
 
 import Link from 'next/link'
 import { useEffect, useMemo, useRef, useState } from 'react'
 
 type HoverInfo = {
   row: number
   col: number
   index: number
 } | null
 
 function clamp(n: number, min: number, max: number) {
   return Math.max(min, Math.min(max, n))
 }
 
 export default function SpritesPage() {
   const canvasRef = useRef<HTMLCanvasElement | null>(null)
   const imgRef = useRef<HTMLImageElement | null>(null)
 
   const [src, setSrc] = useState<string>('/Interiors_free_16x16.png')
   const [tileW, setTileW] = useState<number>(16)
   const [tileH, setTileH] = useState<number>(16)
   const [zoom, setZoom] = useState<number>(3)
   const [showGrid, setShowGrid] = useState<boolean>(true)
   const [showNumbers, setShowNumbers] = useState<boolean>(true)
   const [hover, setHover] = useState<HoverInfo>(null)
   const [error, setError] = useState<string | null>(null)
 
   const derived = useMemo(() => {
     const img = imgRef.current
     const w = img?.naturalWidth ?? 0
     const h = img?.naturalHeight ?? 0
     const tw = Math.max(1, Math.floor(tileW || 1))
     const th = Math.max(1, Math.floor(tileH || 1))
     const cols = tw > 0 ? Math.floor(w / tw) : 0
     const rows = th > 0 ? Math.floor(h / th) : 0
     return { w, h, tw, th, cols, rows }
   }, [tileW, tileH, src])
 
   useEffect(() => {
     const img = new Image()
     img.crossOrigin = 'anonymous'
     img.onload = () => {
       imgRef.current = img
       setError(null)
       draw()
     }
     img.onerror = () => {
       imgRef.current = null
       setError('Không load được ảnh. Hãy thử upload file hoặc kiểm tra đường dẫn.')
       draw()
     }
     img.src = src
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [src])
 
   useEffect(() => {
     draw()
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [tileW, tileH, zoom, showGrid, showNumbers, hover])
 
   function draw() {
     const canvas = canvasRef.current
     const img = imgRef.current
     if (!canvas) return
 
     const ctx = canvas.getContext('2d')
     if (!ctx) return
 
     const w = img?.naturalWidth ?? 0
     const h = img?.naturalHeight ?? 0
 
     const scale = clamp(zoom, 0.5, 20)
     const cssW = Math.max(1, Math.floor(w * scale))
     const cssH = Math.max(1, Math.floor(h * scale))
 
     const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
     canvas.style.width = `${cssW}px`
     canvas.style.height = `${cssH}px`
     canvas.width = Math.max(1, Math.floor(cssW * dpr))
     canvas.height = Math.max(1, Math.floor(cssH * dpr))
 
     ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
     ctx.clearRect(0, 0, cssW, cssH)
 
     // Draw image
     if (img && w > 0 && h > 0) {
       ctx.imageSmoothingEnabled = false
       ctx.drawImage(img, 0, 0, cssW, cssH)
     } else {
       ctx.fillStyle = '#f0f0f0'
       ctx.fillRect(0, 0, cssW, cssH)
       ctx.fillStyle = '#666'
       ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
       ctx.fillText('No image', 12, 24)
     }
 
     const tw = Math.max(1, Math.floor(tileW || 1))
     const th = Math.max(1, Math.floor(tileH || 1))
     const stepX = tw * scale
     const stepY = th * scale
 
     // Grid
     if (showGrid && img && stepX > 0 && stepY > 0) {
       ctx.save()
       ctx.strokeStyle = 'rgba(0,0,0,0.25)'
       ctx.lineWidth = 1
 
       // Vertical lines
       for (let x = 0; x <= cssW; x += stepX) {
         ctx.beginPath()
         ctx.moveTo(Math.round(x) + 0.5, 0)
         ctx.lineTo(Math.round(x) + 0.5, cssH)
         ctx.stroke()
       }
 
       // Horizontal lines
       for (let y = 0; y <= cssH; y += stepY) {
         ctx.beginPath()
         ctx.moveTo(0, Math.round(y) + 0.5)
         ctx.lineTo(cssW, Math.round(y) + 0.5)
         ctx.stroke()
       }
       ctx.restore()
     }
 
     // Numbers
     if (showNumbers && img && stepX >= 8 && stepY >= 8) {
       const cols = Math.floor(w / tw)
       const rows = Math.floor(h / th)
       const fontSize = Math.max(8, Math.floor(Math.min(stepX, stepY) * 0.28))
       ctx.save()
       ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`
       ctx.textBaseline = 'top'
       ctx.lineWidth = 3
       for (let r = 0; r < rows; r++) {
         for (let c = 0; c < cols; c++) {
           const index = r * cols + c
           const x = c * stepX + 2
           const y = r * stepY + 2
           // Outline for contrast
           ctx.strokeStyle = 'rgba(0,0,0,0.75)'
           ctx.strokeText(String(index), x, y)
           ctx.fillStyle = 'rgba(255,255,255,0.95)'
           ctx.fillText(String(index), x, y)
         }
       }
       ctx.restore()
     }
 
     // Hover highlight
     if (hover && img) {
       const x = hover.col * stepX
       const y = hover.row * stepY
       ctx.save()
       ctx.strokeStyle = 'rgba(255, 200, 0, 0.9)'
       ctx.lineWidth = 2
       ctx.strokeRect(Math.round(x) + 1, Math.round(y) + 1, Math.round(stepX) - 2, Math.round(stepY) - 2)
       ctx.fillStyle = 'rgba(255, 200, 0, 0.18)'
       ctx.fillRect(Math.round(x), Math.round(y), Math.round(stepX), Math.round(stepY))
       ctx.restore()
     }
   }
 
   function setFromFile(file: File) {
     const url = URL.createObjectURL(file)
     setSrc(url)
   }
 
   function onMove(e: React.MouseEvent<HTMLCanvasElement>) {
     const canvas = canvasRef.current
     const img = imgRef.current
     if (!canvas || !img) return
 
     const rect = canvas.getBoundingClientRect()
     const x = e.clientX - rect.left
     const y = e.clientY - rect.top
 
     const scale = clamp(zoom, 0.5, 20)
     const tw = Math.max(1, Math.floor(tileW || 1))
     const th = Math.max(1, Math.floor(tileH || 1))
     const stepX = tw * scale
     const stepY = th * scale
 
     const cols = Math.floor((img.naturalWidth ?? 0) / tw)
     const rows = Math.floor((img.naturalHeight ?? 0) / th)
     const col = Math.floor(x / stepX)
     const row = Math.floor(y / stepY)
 
     if (col < 0 || row < 0 || col >= cols || row >= rows) {
       setHover(null)
       return
     }
 
     const index = row * cols + col
     setHover({ row, col, index })
   }
 
   async function onClick() {
     if (!hover) return
     const text = `${hover.index} (row=${hover.row}, col=${hover.col})`
     try {
       await navigator.clipboard.writeText(text)
     } catch {
       // ignore clipboard failures (permissions, non-HTTPS, etc.)
     }
   }
 
   return (
     <div id="game-container" style={{ overflow: 'hidden' }}>
       <div style={{ padding: '12px 16px', background: 'var(--bg-warm)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
           <div style={{ fontWeight: 800, color: 'var(--brown-dark)' }}>Tilesheet Viewer</div>
           <Link href="/" style={{ color: 'var(--brown-dark)', fontWeight: 700, textDecoration: 'none' }}>
             ← Back
           </Link>
         </div>
 
         <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
           <button
             onClick={() => setSrc('/Interiors_free_16x16.png')}
             style={{
               padding: '10px 12px',
               borderRadius: 12,
               border: '2px solid var(--brown-light)',
               background: 'var(--cream)',
               fontWeight: 800,
               cursor: 'pointer',
               minHeight: 44,
             }}
           >
             Dùng ảnh mặc định
           </button>
 
           <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, border: '2px solid var(--brown-light)', background: 'var(--cream)', cursor: 'pointer', minHeight: 44 }}>
             <span style={{ fontWeight: 800, color: 'var(--text-dark)' }}>Upload</span>
             <input
               type="file"
               accept="image/*"
               onChange={(e) => {
                 const f = e.target.files?.[0]
                 if (f) setFromFile(f)
               }}
               style={{ display: 'none' }}
             />
           </label>
 
           <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
             <span style={{ fontWeight: 800, color: 'var(--brown-dark)' }}>Tile W</span>
             <input
               type="number"
               inputMode="numeric"
               value={tileW}
               min={1}
               onChange={(e) => setTileW(Math.max(1, Number(e.target.value) || 1))}
               style={{ width: 78, padding: '10px 10px', borderRadius: 12, border: '2px solid var(--brown-light)', background: 'var(--cream)', fontWeight: 800, minHeight: 44 }}
             />
           </label>
 
           <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
             <span style={{ fontWeight: 800, color: 'var(--brown-dark)' }}>Tile H</span>
             <input
               type="number"
               inputMode="numeric"
               value={tileH}
               min={1}
               onChange={(e) => setTileH(Math.max(1, Number(e.target.value) || 1))}
               style={{ width: 78, padding: '10px 10px', borderRadius: 12, border: '2px solid var(--brown-light)', background: 'var(--cream)', fontWeight: 800, minHeight: 44 }}
             />
           </label>
 
           <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
             <span style={{ fontWeight: 800, color: 'var(--brown-dark)' }}>Zoom</span>
             <input
               type="range"
               min={1}
               max={12}
               step={0.5}
               value={zoom}
               onChange={(e) => setZoom(Number(e.target.value))}
               style={{ width: 160 }}
             />
             <span style={{ width: 44, textAlign: 'right', fontWeight: 800, color: 'var(--brown-dark)' }}>{zoom}x</span>
           </label>
 
           <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, border: '2px solid var(--brown-light)', background: 'var(--cream)', cursor: 'pointer', minHeight: 44 }}>
             <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
             <span style={{ fontWeight: 800, color: 'var(--text-dark)' }}>Grid</span>
           </label>
 
           <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, border: '2px solid var(--brown-light)', background: 'var(--cream)', cursor: 'pointer', minHeight: 44 }}>
             <input type="checkbox" checked={showNumbers} onChange={(e) => setShowNumbers(e.target.checked)} />
             <span style={{ fontWeight: 800, color: 'var(--text-dark)' }}>Number</span>
           </label>
         </div>
 
         <div style={{ marginTop: 10, color: 'var(--text-medium)', fontWeight: 700, fontSize: 12, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
           <div>
             Ảnh: <span style={{ color: 'var(--text-dark)' }}>{derived.w}×{derived.h}px</span>
           </div>
           <div>
             Lưới: <span style={{ color: 'var(--text-dark)' }}>{derived.cols} cột × {derived.rows} hàng</span>
           </div>
           <div>
             Hover/click: <span style={{ color: 'var(--text-dark)' }}>{hover ? `${hover.index} (r=${hover.row}, c=${hover.col})` : '—'}</span>
           </div>
           <div style={{ color: 'var(--text-medium)' }}>(Click để copy index)</div>
         </div>
 
         {error ? (
           <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: '#ffebee', border: '1px solid rgba(0,0,0,0.08)', color: '#8a1f1f', fontWeight: 700 }}>
             {error}
           </div>
         ) : null}
       </div>
 
       <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-container)' }}>
         <div style={{ padding: 16 }}>
           <div style={{ display: 'inline-block', background: 'var(--cream)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: 12 }}>
             <canvas
               ref={canvasRef}
               onMouseMove={onMove}
               onMouseLeave={() => setHover(null)}
               onClick={onClick}
               style={{ display: 'block', cursor: 'crosshair' }}
             />
           </div>
         </div>
       </div>
     </div>
   )
 }
