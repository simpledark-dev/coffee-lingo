import { zipSync, strToU8 } from 'fflate'
import type { EditorState } from '../types/editor'
import type { EntityDef } from '../types/entity'
import type { ZoneDef } from '../types/collision'
import type { Project } from '../types/project'
import { listAssets, getAssetBlob, listEntityDefs } from '../storage/db'
import type { StoredEntityDef } from '../storage/db'
import { exportJson } from './exportJson'

/**
 * Game Export — structured zip with separate files + TypeScript enums.
 *
 * Structure:
 *   assets/                  — raw asset images
 *   data/
 *     entity-defs.json       — entity definitions (without projectId)
 *     zone-defs.json         — zone definitions
 *     tilemap.json           — tile layers, grid, viewport
 *     entities.json          — entity layers + instances
 *   types/
 *     entities.ts            — enum EntityType
 *     states.ts              — enum EntityState
 *     zones.ts               — enum ZoneType
 *   project.json             — project metadata
 */

export async function exportGameZip(projectId: string, project: Project, editorState: EditorState | null): Promise<Uint8Array> {
  const assets = await listAssets(projectId)
  const storedEntityDefs = await listEntityDefs(projectId)
  const entityDefs: EntityDef[] = storedEntityDefs.map(({ projectId: _, ...def }: StoredEntityDef) => def)

  const zipData: Record<string, Uint8Array> = {}

  // ── Assets ──
  for (let i = 0; i < assets.length; i++) {
    const a = assets[i]
    const ext = a.filename.split('.').pop() || 'bin'
    const blob = await getAssetBlob(a.id)
    if (blob) {
      zipData[`assets/${a.id}.${ext}`] = new Uint8Array(blob)
    }
  }

  // ── Asset manifest ──
  const assetManifest = assets.map(a => ({
    id: a.id,
    name: a.name,
    category: a.category,
    filename: a.filename,
    file: `assets/${a.id}.${a.filename.split('.').pop() || 'bin'}`,
    width: a.width,
    height: a.height,
  }))
  zipData['data/assets.json'] = strToU8(JSON.stringify(assetManifest, null, 2))

  // ── Data files ──

  // Entity definitions
  zipData['data/entity-defs.json'] = strToU8(JSON.stringify(entityDefs, null, 2))

  // Zone definitions
  const zoneDefs = editorState?.zoneDefs ?? []
  zipData['data/zone-defs.json'] = strToU8(JSON.stringify(zoneDefs, null, 2))

  // Tilemap (layers, grid, tilesets — no entities, no zones)
  if (editorState) {
    const tilemapData = exportJson(editorState)
    // Strip entity/zone data from tilemap — they're in separate files
    const { entityLayers: _el, zoneDefs: _zd, zones: _z, ...tilemap } = tilemapData
    zipData['data/tilemap.json'] = strToU8(JSON.stringify(tilemap, null, 2))

    // Entities (entity layers)
    zipData['data/entities.json'] = strToU8(JSON.stringify(editorState.entityLayers, null, 2))

    // Zones (instances)
    zipData['data/zones.json'] = strToU8(JSON.stringify(editorState.zones, null, 2))
  }

  // ── TypeScript enums ──

  // Data types
  zipData['types/data.ts'] = strToU8(generateDataTypes())

  // Entity types enum
  zipData['types/entities.ts'] = strToU8(generateEntityEnum(entityDefs))

  // Entity states enum
  zipData['types/states.ts'] = strToU8(generateStatesEnum(entityDefs))

  // Zone types enum
  zipData['types/zones.ts'] = strToU8(generateZoneEnum(zoneDefs))

  // ── Project metadata ──
  zipData['project.json'] = strToU8(JSON.stringify({
    name: project.name,
    tileSize: project.tileSize,
  }, null, 2))

  return zipSync(zipData, { level: 6 })
}

// ── Data types generator ──

function generateDataTypes(): string {
  return `/**
 * Auto-generated data types for game runtime.
 * Matches the JSON structures in data/ folder.
 */

// ── Assets ──

export interface Asset {
  id: string
  name: string
  category: string
  filename: string
  file: string
  width: number
  height: number
}

// ── Tilemap ──

export interface TilePlacement {
  tilesetId: string
  tileIndex: number
}

export interface TileLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  tiles: number[] // flat: [row, col, tilesetIdx, tileIndex, ...]
}

export interface Tilemap {
  version: number
  name: string
  gridCols: number
  gridRows: number
  tileSize: number
  tilesets: string[]
  layers: TileLayer[]
  viewport?: { zoom: number; panX: number; panY: number }
}

// ── Entities ──

export interface EntityVisual {
  mode: 'static' | 'animated'
  assetId: string
  tileIndex?: number
  width: number
  height: number
  frameCount?: number
  frameDuration?: number
  loop?: 'loop' | 'pingpong' | 'once'
}

export interface EntityCollisionZone {
  type: string
  row: number
  col: number
  width: number
  height: number
}

export interface EntityDef {
  id: string
  name: string
  type: string
  tags: string[]
  description: string
  states: Record<string, EntityVisual>
  defaultState: string
  collision?: { zones: EntityCollisionZone[] }
  properties: Record<string, unknown>
}

export interface Entity {
  id: string
  defId: string
  row: number
  col: number
  properties: Record<string, unknown>
}

export interface EntityLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  entities: Entity[]
}

// ── Zones ──

export interface ZoneDef {
  type: string
  color: string
  properties: Record<string, unknown>
}

export interface Zone {
  id: string
  type: string
  row: number
  col: number
  width: number
  height: number
  properties: Record<string, unknown>
}

// ── Project ──

export interface Project {
  name: string
  tileSize: number
}
`
}

// ── Enum generators ──

function toEnumKey(name: string): string {
  // "Goblin NPC" → "GoblinNpc", "fire_station" → "FireStation"
  return name
    .replace(/[^a-zA-Z0-9_\s]/g, '')
    .split(/[\s_-]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
    || 'Unknown'
}

function ensureUnique(keys: string[]): string[] {
  const seen = new Map<string, number>()
  return keys.map(k => {
    const count = seen.get(k) ?? 0
    seen.set(k, count + 1)
    return count === 0 ? k : `${k}${count + 1}`
  })
}

function generateEntityEnum(defs: EntityDef[]): string {
  if (defs.length === 0) return '// No entity definitions\nexport enum EntityType {}\n'

  const keys = ensureUnique(defs.map(d => toEnumKey(d.name)))
  const entries = defs.map((d, i) => `  ${keys[i]} = '${d.id}',`)

  return `/**
 * Auto-generated entity type enum.
 * Maps entity name → entity definition ID.
 */
export enum EntityType {
${entries.join('\n')}
}

/** Entity definition ID type */
export type EntityTypeId = \`\${EntityType}\`

/** Entity name → ID lookup */
export const ENTITY_NAMES: Record<EntityType, string> = {
${defs.map((d, i) => `  [EntityType.${keys[i]}]: '${d.name.replace(/'/g, "\\'")}',`).join('\n')}
}
`
}

function generateStatesEnum(defs: EntityDef[]): string {
  if (defs.length === 0) return '// No entity states\n'

  const entityKeys = ensureUnique(defs.map(d => toEnumKey(d.name)))
  const blocks: string[] = []

  blocks.push(`/**
 * Auto-generated entity state enums.
 * Each entity has its own state enum.
 */
`)

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i]
    const stateNames = Object.keys(def.states)
    if (stateNames.length === 0) continue

    const stateKeys = ensureUnique(stateNames.map(s => toEnumKey(s)))
    blocks.push(`export enum ${entityKeys[i]}State {
${stateNames.map((s, j) => `  ${stateKeys[j]} = '${s}',`).join('\n')}
}
`)
  }

  // Also generate a union type of all state enums
  const enumNames = defs.filter(d => Object.keys(d.states).length > 0).map((_, i) => `${entityKeys[i]}State`)
  if (enumNames.length > 0) {
    blocks.push(`/** Union of all entity state enums */
export type AnyEntityState = ${enumNames.join(' | ')}
`)
  }

  return blocks.join('\n')
}

function generateZoneEnum(zoneDefs: ZoneDef[]): string {
  if (zoneDefs.length === 0) return '// No zone definitions\nexport enum ZoneType {}\n'

  const keys = ensureUnique(zoneDefs.map(d => toEnumKey(d.type)))

  return `/**
 * Auto-generated zone type enum.
 */
export enum ZoneType {
${zoneDefs.map((d, i) => `  ${keys[i]} = '${d.type}',`).join('\n')}
}

/** Zone type → color mapping */
export const ZONE_COLORS: Record<ZoneType, string> = {
${zoneDefs.map((d, i) => `  [ZoneType.${keys[i]}]: '${d.color}',`).join('\n')}
}
`
}
