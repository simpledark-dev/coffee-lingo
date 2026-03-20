import type { ToolHandlers } from './toolTypes'
import type { ToolType } from '../types/editor'
import { pencilTool } from './pencilTool'
import { eraserTool } from './eraserTool'
import { fillTool } from './fillTool'
import { selectTool } from './selectTool'
import { eyedropperTool } from './eyedropperTool'

export const tools: Record<ToolType, ToolHandlers> = {
  pencil: pencilTool,
  eraser: eraserTool,
  fill: fillTool,
  select: selectTool,
  eyedropper: eyedropperTool,
}
