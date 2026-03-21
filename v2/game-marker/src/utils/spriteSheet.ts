/**
 * Compute the source rect for a frame in a sprite sheet.
 * Frames are numbered left-to-right, top-to-bottom.
 */
export function getFrameRect(
  imgWidth: number,
  frameSize: { w: number; h: number },
  frameIndex: number,
): { x: number; y: number; w: number; h: number } {
  const cols = Math.floor(imgWidth / frameSize.w)
  if (cols <= 0) return { x: 0, y: 0, w: frameSize.w, h: frameSize.h }
  const col = frameIndex % cols
  const row = Math.floor(frameIndex / cols)
  return {
    x: col * frameSize.w,
    y: row * frameSize.h,
    w: frameSize.w,
    h: frameSize.h,
  }
}

/** Total number of frames that fit in a sprite sheet. */
export function getFrameCount(
  imgWidth: number,
  imgHeight: number,
  frameSize: { w: number; h: number },
): number {
  const cols = Math.floor(imgWidth / frameSize.w)
  const rows = Math.floor(imgHeight / frameSize.h)
  return cols * rows
}

/** Draw a single frame from a sprite sheet onto a canvas context. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  frameIndex: number,
  frameSize: { w: number; h: number },
  destX: number,
  destY: number,
  destW: number,
  destH: number,
): void {
  const src = getFrameRect(image.naturalWidth, frameSize, frameIndex)
  ctx.drawImage(image, src.x, src.y, src.w, src.h, destX, destY, destW, destH)
}
