export interface Expression {
  id: string
  text: string
  nativeText: string
  ideaTags: string[]
  stage: number
}

export interface ResponseOption {
  text: string
  score: Score
  expressionIds: string[]
}

export interface DialogueTemplate {
  id: string
  ideaCategory: string
  difficulty: number
  customerLines: {
    text: string
    variables: Record<string, string[]>
  }[]
  requiredIdeas: string[]
  bonusIdeas: string[]
  responses: ResponseOption[]
  followUpIds: string[]
}

export interface AnswerChoice {
  id: string
  expressions: Expression[]
  displayText: string
  score: Score
}

export interface ResolvedExchange {
  customerLine: string
  requiredIdeas: string[]
  bonusIdeas: string[]
  choices: AnswerChoice[]
  templateId: string
  hintIdea: string
  hintTranslation: string
}

export interface CustomerConversation {
  exchanges: ResolvedExchange[]
}

export type Score = 'PERFECT' | 'GOOD' | 'UNDERSTOOD' | 'MISSED'

export interface EvaluationResult {
  score: Score
  coveredRequired: string[]
  coveredBonus: string[]
  tipAmount: number
}

export interface UpgradeLevel {
  tier: number
  upgrading?: {
    toTier: number
    startedAt: number
    durationMs: number
  }
}

export interface Relationship {
  friendship: number       // 0-100
  timesServed: number
  lastSeenAt: number       // totalCustomersServed when last seen
}

export interface PlayerState {
  totalCustomersServed: number
  coins: number
  reputation: number
  vocabulary: Record<string, VocabularyEntry>
  recencyBuffer: string[]
  upgrades?: Record<string, UpgradeLevel>
  relationships?: Record<string, Relationship>
}

export interface VocabularyEntry {
  masteryLevel: number
  totalSuccessfulUses: number
}

// --- World simulation types ---

export type WorldLocation = 'outside' | 'interior'

export interface GridPos {
  row: number
  col: number
}

export interface WorldPos {
  x: number
  y: number
}

export type CustomerDirection = 'down' | 'left' | 'right' | 'up'

export interface PointOfInterest {
  id: string
  type: 'counter' | 'chair' | 'shelf' | 'menu' | 'window' | 'plant' | 'floor' | 'bookshelf' | 'bench' | 'fountain' | 'tree' | 'pond'
  pos: GridPos
  facingDir: CustomerDirection
  maxOccupants: number
}

export type CustPhase =
  | 'entering'
  | 'walking'
  | 'idle'
  | 'exclamation'
  | 'conversing'
  | 'post-convo'
  | 'exiting'

export interface CustomerState {
  id: number
  characterId: string
  spriteVariant: number
  phase: CustPhase
  location: WorldLocation
  worldPos: WorldPos              // position on interior grid
  outsideWorldPos: WorldPos       // position on outside grid
  path: GridPos[]
  pathIndex: number
  currentPOI: string | null
  targetPOI: string | null
  facingDir: CustomerDirection
  conversation: CustomerConversation
  nextExchangeIndex: number
  exclamationTimer: number | null
  idleTimer: number | null
  stopsRemaining: number          // POI stops remaining in current location
  outsideStopsRemaining: number   // outside POI stops before deciding next action
  hasActiveRequest: boolean
}

export interface ActiveConvo {
  customerId: number
  exchangeIndex: number
  hintLevel: number
  selectedChoiceId: string | null
  result: EvaluationResult | null
  showPhase: 'presenting' | 'scored'
  patienceStart: number
}

export interface WorldState {
  characters: CustomerState[]
  activeConvo: ActiveConvo | null
  interiorPOIOccupancy: Map<string, number[]>
  outsidePOIOccupancy: Map<string, number[]>
  nextId: number
  spawnTimer: number
  totalSpawned: number
  maxInWorld: number    // total characters across all locations (e.g. 12)
  maxInCafe: number     // max characters inside cafe (6 + upgrades)
}

// Keep alias for compatibility during migration
export type CafeState = WorldState

export interface WorldTickResult {
  shouldSpawn: boolean
}

export type CafeTickResult = WorldTickResult
