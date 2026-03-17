import type { UpgradeLevel } from './types'

export interface UpgradeTier {
  tier: number
  name: string
  description: string
  bonusDescription: string
  cost: number
  requiredReputation: number
  durationMs: number
  spriteKey: string
}

export interface UpgradeBonuses {
  tipMultiplier: number           // Coffee Machine: 1.0 / 1.10 / 1.25
  repBonusPerCustomer: number     // Counter: 0 / 0.2 / 0.4 rep per customer
  maxInShopBonus: number          // Table: 0 / 1 / 2 extra simultaneous customers
  patienceBonus: number           // Chair: 0 / 5000 / 10000 (ms)
  bonusCoinChance: number         // Plant: 0 / 0.10 / 0.20
  hintPenaltyReduction: number    // Lamp: 0 / 0.15 / 0.30
  masteryXpMultiplier: number     // Shelf: 1.0 / 1.20 / 1.40
  coinMultiplier: number          // Floor: 1.0 / 1.05 / 1.10
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
      { tier: 1, name: 'Flowering Plant', description: 'Pink and coral blooms', bonusDescription: '10% chance of +5 bonus coins', cost: 100, requiredReputation: 10, durationMs: 30 * MIN, spriteKey: 'PLANT_T1' },
      { tier: 2, name: 'Ornamental Tree', description: 'Lush canopy, saucer pot', bonusDescription: '20% chance of +5 bonus coins', cost: 250, requiredReputation: 30, durationMs: 2 * HOUR, spriteKey: 'PLANT_T2' },
    ],
  },
  {
    id: 'LAMP',
    displayName: 'Lamp',
    defaultSpriteKey: 'LAMP',
    tiers: [
      { tier: 1, name: 'Art Deco Lamp', description: 'Geometric shade, warm glow', bonusDescription: '15% less hint penalty', cost: 100, requiredReputation: 10, durationMs: 30 * MIN, spriteKey: 'LAMP_T1' },
      { tier: 2, name: 'Crystal Chandelier', description: 'Multi-arm sparkle', bonusDescription: '30% less hint penalty', cost: 300, requiredReputation: 30, durationMs: 2 * HOUR, spriteKey: 'LAMP_T2' },
    ],
  },
  {
    id: 'CHAIR',
    displayName: 'Chair',
    defaultSpriteKey: 'CHAIR',
    tiers: [
      { tier: 1, name: 'Cushioned Bistro', description: 'Padded seat, curved back', bonusDescription: '+5s response time', cost: 120, requiredReputation: 10, durationMs: 45 * MIN, spriteKey: 'CHAIR_T1' },
      { tier: 2, name: 'Velvet Armchair', description: 'Plush tufted upholstery', bonusDescription: '+10s response time', cost: 350, requiredReputation: 30, durationMs: 2.5 * HOUR, spriteKey: 'CHAIR_T2' },
    ],
  },
  {
    id: 'TABLE',
    displayName: 'Table',
    defaultSpriteKey: 'TABLE',
    tiers: [
      { tier: 1, name: 'Marble Bistro', description: 'Light surface, thin legs', bonusDescription: '+1 max customers in shop', cost: 150, requiredReputation: 10, durationMs: 1 * HOUR, spriteKey: 'TABLE_T1' },
      { tier: 2, name: 'Ornate Parisian', description: 'Iron scrollwork, mosaic top', bonusDescription: '+2 max customers in shop', cost: 400, requiredReputation: 30, durationMs: 3 * HOUR, spriteKey: 'TABLE_T2' },
    ],
  },
  {
    id: 'SHELF',
    displayName: 'Shelf',
    defaultSpriteKey: 'SHELF',
    tiers: [
      { tier: 1, name: 'Artisan Shelf', description: 'Grinder, books, variety', bonusDescription: '+20% mastery XP', cost: 150, requiredReputation: 10, durationMs: 1 * HOUR, spriteKey: 'SHELF_T1' },
      { tier: 2, name: 'Display Cabinet', description: 'Glass front, premium items', bonusDescription: '+40% mastery XP', cost: 400, requiredReputation: 30, durationMs: 3 * HOUR, spriteKey: 'SHELF_T2' },
    ],
  },
  {
    id: 'COFFEE_MACHINE',
    displayName: 'Coffee Machine',
    defaultSpriteKey: 'COFFEE_MACHINE',
    tiers: [
      { tier: 1, name: 'Brass Espresso', description: 'Warm gold finish', bonusDescription: '+10% tips', cost: 200, requiredReputation: 10, durationMs: 1.5 * HOUR, spriteKey: 'COFFEE_MACHINE_T1' },
      { tier: 2, name: 'Vintage La Marzocca', description: 'Copper masterpiece', bonusDescription: '+25% tips', cost: 500, requiredReputation: 30, durationMs: 4 * HOUR, spriteKey: 'COFFEE_MACHINE_T2' },
    ],
  },
  {
    id: 'COUNTER',
    displayName: 'Counter',
    defaultSpriteKey: 'COUNTER_TOP',
    tiers: [
      { tier: 1, name: 'Polished Wood', description: 'Rich grain, darker tones', bonusDescription: '+1 rep per customer', cost: 200, requiredReputation: 10, durationMs: 1.5 * HOUR, spriteKey: 'COUNTER_TOP_T1' },
      { tier: 2, name: 'Marble Counter', description: 'White and gray surface', bonusDescription: '+2 rep per customer', cost: 500, requiredReputation: 30, durationMs: 4 * HOUR, spriteKey: 'COUNTER_TOP_T2' },
    ],
  },
  {
    id: 'FLOOR',
    displayName: 'Floor',
    defaultSpriteKey: 'FLOOR_WOOD',
    tiers: [
      { tier: 1, name: 'Herringbone Parquet', description: 'Angled plank pattern', bonusDescription: '+5% all coins', cost: 250, requiredReputation: 10, durationMs: 2 * HOUR, spriteKey: 'FLOOR_HERRINGBONE' },
      { tier: 2, name: 'Checkered Marble', description: 'Classic French cafe', bonusDescription: '+10% all coins', cost: 600, requiredReputation: 30, durationMs: 5 * HOUR, spriteKey: 'FLOOR_MARBLE' },
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

const BONUS_TABLE: Record<string, Record<number, Partial<UpgradeBonuses>>> = {
  COFFEE_MACHINE: { 1: { tipMultiplier: 1.10 }, 2: { tipMultiplier: 1.25 } },
  COUNTER:        { 1: { repBonusPerCustomer: 1 }, 2: { repBonusPerCustomer: 2 } },
  TABLE:          { 1: { maxInShopBonus: 1 },       2: { maxInShopBonus: 2 } },
  CHAIR:          { 1: { patienceBonus: 5000 },   2: { patienceBonus: 10000 } },
  PLANT:          { 1: { bonusCoinChance: 0.10 }, 2: { bonusCoinChance: 0.20 } },
  LAMP:           { 1: { hintPenaltyReduction: 0.15 }, 2: { hintPenaltyReduction: 0.30 } },
  SHELF:          { 1: { masteryXpMultiplier: 1.20 },  2: { masteryXpMultiplier: 1.40 } },
  FLOOR:          { 1: { coinMultiplier: 1.05 },  2: { coinMultiplier: 1.10 } },
}

const DEFAULT_BONUSES: UpgradeBonuses = {
  tipMultiplier: 1,
  repBonusPerCustomer: 0,
  maxInShopBonus: 0,
  patienceBonus: 0,
  bonusCoinChance: 0,
  hintPenaltyReduction: 0,
  masteryXpMultiplier: 1,
  coinMultiplier: 1,
}

export function getUpgradeBonuses(upgrades?: Record<string, UpgradeLevel>): UpgradeBonuses {
  if (!upgrades) return { ...DEFAULT_BONUSES }
  const bonuses = { ...DEFAULT_BONUSES }
  for (const [id, level] of Object.entries(upgrades)) {
    const tierBonuses = BONUS_TABLE[id]?.[level.tier]
    if (tierBonuses) Object.assign(bonuses, tierBonuses)
  }
  return bonuses
}

// --- Reputation level system ---
export interface RepLevel {
  level: number
  title: string
  minRep: number
}

const REP_LEVELS: RepLevel[] = [
  { level: 1, title: 'Newcomer', minRep: 0 },
  { level: 2, title: 'Regular', minRep: 15 },
  { level: 3, title: 'Barista', minRep: 40 },
  { level: 4, title: 'Head Barista', minRep: 80 },
  { level: 5, title: 'Café Manager', minRep: 140 },
  { level: 6, title: 'Master Roaster', minRep: 220 },
  { level: 7, title: 'Coffee Legend', minRep: 350 },
]

export function getRepLevel(reputation: number): { current: RepLevel; next: RepLevel | null; progress: number } {
  let current = REP_LEVELS[0]
  for (const lvl of REP_LEVELS) {
    if (reputation >= lvl.minRep) current = lvl
    else break
  }
  const idx = REP_LEVELS.indexOf(current)
  const next = idx < REP_LEVELS.length - 1 ? REP_LEVELS[idx + 1] : null
  const progress = next
    ? (reputation - current.minRep) / (next.minRep - current.minRep)
    : 1
  return { current, next, progress }
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
