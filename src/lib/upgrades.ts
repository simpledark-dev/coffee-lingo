import type { UpgradeLevel } from './types'

export interface UpgradeTier {
  tier: number
  name: string
  description: string
  cost: number
  requiredReputation: number
  durationMs: number
  spriteKey: string
}

export interface UpgradeCatalogEntry {
  id: string
  displayName: string
  defaultSpriteKey: string
  tiers: UpgradeTier[]
}

// Debug: set to 0 for instant upgrades, or e.g. 0.01 for ~100x faster timers
export const UPGRADE_TIME_SCALE = 0

const MIN = 60_000 * UPGRADE_TIME_SCALE
const HOUR = 3_600_000 * UPGRADE_TIME_SCALE

export const UPGRADE_CATALOG: UpgradeCatalogEntry[] = [
  {
    id: 'PLANT',
    displayName: 'Plant',
    defaultSpriteKey: 'PLANT',
    tiers: [
      { tier: 1, name: 'Flowering Plant', description: 'Pink and coral blooms', cost: 100, requiredReputation: 10, durationMs: 30 * MIN, spriteKey: 'PLANT_T1' },
      { tier: 2, name: 'Ornamental Tree', description: 'Lush canopy, saucer pot', cost: 250, requiredReputation: 30, durationMs: 2 * HOUR, spriteKey: 'PLANT_T2' },
    ],
  },
  {
    id: 'LAMP',
    displayName: 'Lamp',
    defaultSpriteKey: 'LAMP',
    tiers: [
      { tier: 1, name: 'Art Deco Lamp', description: 'Geometric shade, warm glow', cost: 100, requiredReputation: 10, durationMs: 30 * MIN, spriteKey: 'LAMP_T1' },
      { tier: 2, name: 'Crystal Chandelier', description: 'Multi-arm sparkle', cost: 300, requiredReputation: 30, durationMs: 2 * HOUR, spriteKey: 'LAMP_T2' },
    ],
  },
  {
    id: 'CHAIR',
    displayName: 'Chair',
    defaultSpriteKey: 'CHAIR',
    tiers: [
      { tier: 1, name: 'Cushioned Bistro', description: 'Padded seat, curved back', cost: 120, requiredReputation: 10, durationMs: 45 * MIN, spriteKey: 'CHAIR_T1' },
      { tier: 2, name: 'Velvet Armchair', description: 'Plush tufted upholstery', cost: 350, requiredReputation: 30, durationMs: 2.5 * HOUR, spriteKey: 'CHAIR_T2' },
    ],
  },
  {
    id: 'TABLE',
    displayName: 'Table',
    defaultSpriteKey: 'TABLE',
    tiers: [
      { tier: 1, name: 'Marble Bistro', description: 'Light surface, thin legs', cost: 150, requiredReputation: 10, durationMs: 1 * HOUR, spriteKey: 'TABLE_T1' },
      { tier: 2, name: 'Ornate Parisian', description: 'Iron scrollwork, mosaic top', cost: 400, requiredReputation: 30, durationMs: 3 * HOUR, spriteKey: 'TABLE_T2' },
    ],
  },
  {
    id: 'SHELF',
    displayName: 'Shelf',
    defaultSpriteKey: 'SHELF',
    tiers: [
      { tier: 1, name: 'Artisan Shelf', description: 'Grinder, books, variety', cost: 150, requiredReputation: 10, durationMs: 1 * HOUR, spriteKey: 'SHELF_T1' },
      { tier: 2, name: 'Display Cabinet', description: 'Glass front, premium items', cost: 400, requiredReputation: 30, durationMs: 3 * HOUR, spriteKey: 'SHELF_T2' },
    ],
  },
  {
    id: 'COFFEE_MACHINE',
    displayName: 'Coffee Machine',
    defaultSpriteKey: 'COFFEE_MACHINE',
    tiers: [
      { tier: 1, name: 'Brass Espresso', description: 'Warm gold finish', cost: 200, requiredReputation: 10, durationMs: 1.5 * HOUR, spriteKey: 'COFFEE_MACHINE_T1' },
      { tier: 2, name: 'Vintage La Marzocca', description: 'Copper masterpiece', cost: 500, requiredReputation: 30, durationMs: 4 * HOUR, spriteKey: 'COFFEE_MACHINE_T2' },
    ],
  },
  {
    id: 'COUNTER',
    displayName: 'Counter',
    defaultSpriteKey: 'COUNTER_TOP',
    tiers: [
      { tier: 1, name: 'Polished Wood', description: 'Rich grain, darker tones', cost: 200, requiredReputation: 10, durationMs: 1.5 * HOUR, spriteKey: 'COUNTER_TOP_T1' },
      { tier: 2, name: 'Marble Counter', description: 'White and gray surface', cost: 500, requiredReputation: 30, durationMs: 4 * HOUR, spriteKey: 'COUNTER_TOP_T2' },
    ],
  },
  {
    id: 'FLOOR',
    displayName: 'Floor',
    defaultSpriteKey: 'FLOOR_WOOD',
    tiers: [
      { tier: 1, name: 'Herringbone Parquet', description: 'Angled plank pattern', cost: 250, requiredReputation: 10, durationMs: 2 * HOUR, spriteKey: 'FLOOR_HERRINGBONE' },
      { tier: 2, name: 'Checkered Marble', description: 'Classic French cafe', cost: 600, requiredReputation: 30, durationMs: 5 * HOUR, spriteKey: 'FLOOR_MARBLE' },
    ],
  },
]

export function getUpgradeCatalogEntry(upgradeId: string): UpgradeCatalogEntry | undefined {
  return UPGRADE_CATALOG.find((e) => e.id === upgradeId)
}

export function getActiveSpriteKey(
  upgradeId: string,
  upgrades: Record<string, UpgradeLevel> | undefined,
): string {
  const entry = UPGRADE_CATALOG.find((e) => e.id === upgradeId)
  if (!entry) return upgradeId
  const level = upgrades?.[upgradeId]?.tier ?? 0
  if (level === 0) return entry.defaultSpriteKey
  const tierData = entry.tiers.find((t) => t.tier === level)
  return tierData?.spriteKey ?? entry.defaultSpriteKey
}

export function getUpgradeTimeRemaining(upgrade: UpgradeLevel): number {
  if (!upgrade.upgrading) return 0
  const elapsed = Date.now() - upgrade.upgrading.startedAt
  return Math.max(0, upgrade.upgrading.durationMs - elapsed)
}

// Returns IDs of upgrades whose timers have elapsed but haven't been claimed yet
export function getReadyToInstallIds(
  upgrades: Record<string, UpgradeLevel>,
): string[] {
  const ready: string[] = []
  for (const [id, level] of Object.entries(upgrades)) {
    if (level.upgrading && getUpgradeTimeRemaining(level) === 0) {
      ready.push(id)
    }
  }
  return ready
}

// Install (claim) a single completed upgrade — returns updated upgrades record
export function installUpgrade(
  upgrades: Record<string, UpgradeLevel>,
  upgradeId: string,
): Record<string, UpgradeLevel> {
  const level = upgrades[upgradeId]
  if (!level?.upgrading || getUpgradeTimeRemaining(level) > 0) return upgrades
  return {
    ...upgrades,
    [upgradeId]: { tier: level.upgrading.toTier },
  }
}

export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Ready!'
  const totalSeconds = Math.ceil(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}
