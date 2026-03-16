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

export interface PlayerState {
  currentDay: number
  coins: number
  reputation: number
  vocabulary: Record<string, VocabularyEntry>
  recencyBuffer: string[]
  upgrades?: Record<string, UpgradeLevel>
}

export interface VocabularyEntry {
  masteryLevel: number
  totalSuccessfulUses: number
  sessionsUsedIn: number
  lastUsedDay: number
}

export interface DaySummary {
  customersServed: number
  totalCustomers: number
  scores: Record<Score, number>
  coinsEarned: number
  reputationChange: number
  wordsPracticed: number
  wordsLeveledUp: string[]
}

// --- Multi-customer cafe simulation types ---

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
  spriteVariant: number
  phase: CustPhase
  worldPos: WorldPos
  path: GridPos[]
  pathIndex: number
  currentPOI: string | null
  targetPOI: string | null
  facingDir: CustomerDirection
  conversation: CustomerConversation
  nextExchangeIndex: number
  exclamationTimer: number | null
  idleTimer: number | null
  stopsRemaining: number
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

export interface CafeState {
  customers: CustomerState[]
  activeConvo: ActiveConvo | null
  poiOccupancy: Map<string, number[]>
  nextId: number
  spawnTimer: number
  totalSpawned: number
  maxToSpawn: number
  dayAccumulator: DayAccumulator
}

export interface DayAccumulator {
  coinsEarned: number
  reputationChange: number
  scores: Record<Score, number>
  wordsPracticed: Set<string>
  wordsLeveledUp: string[]
  customersServed: number
  playerState: PlayerState
}

export interface CafeTickResult {
  dayOver: boolean
}
