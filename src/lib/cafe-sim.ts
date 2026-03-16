import { findPath, gridToWorld, worldToGrid, movementDirection } from './pathfinding'
import { POINTS_OF_INTEREST, pickNextPOI } from './poi'
import { DOOR_ENTRY, TILE_SIZE, SCALE } from './tilemap'
import { CUSTOMER_SPRITES } from './sprites'
import { getCharacter } from './characters'
import type {
  CafeState,
  CafeTickResult,
  CustomerState,
  CustomerConversation,
  ActiveConvo,
  DayAccumulator,
  PlayerState,
  GridPos,
  Score,
} from './types'

const TILE_PX = TILE_SIZE * SCALE
const MAX_IN_SHOP = 6
const WALK_SPEED = 1.5 // pixels per frame
const SPAWN_MIN = 3000 // ms
const SPAWN_MAX = 6000
const IDLE_MIN = 5000
const IDLE_MAX = 12000
const EXCLAMATION_TIMEOUT = 15000 // ms
const EXCLAMATION_CHANCE = 0.6
const POST_CONVO_PAUSE = 500
const STOPS_MIN = 2
const STOPS_MAX = 5

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

type CafeStateInternal = CafeState & { _conversations: CustomerConversation[]; _roster: string[] }

export function createCafeState(
  conversations: CustomerConversation[],
  maxToSpawn: number,
  playerState: PlayerState,
  roster?: string[],
): CafeState {
  return {
    customers: [],
    activeConvo: null,
    poiOccupancy: new Map(),
    nextId: 0,
    spawnTimer: 1000, // first customer arrives after 1s
    totalSpawned: 0,
    maxToSpawn,
    dayAccumulator: {
      coinsEarned: 0,
      reputationChange: 0,
      scores: { PERFECT: 0, GOOD: 0, UNDERSTOOD: 0, MISSED: 0 },
      wordsPracticed: new Set(),
      wordsLeveledUp: [],
      customersServed: 0,
      playerState: { ...playerState },
      characterScores: new Map(),
    },
    _conversations: conversations,
    _roster: roster ?? [],
  } as CafeStateInternal
}

// Internal: access conversations stored on state
function getConversations(state: CafeState): CustomerConversation[] {
  return (state as CafeStateInternal)._conversations
}

function getRoster(state: CafeState): string[] {
  return (state as CafeStateInternal)._roster
}

function occupyPOI(state: CafeState, poiId: string, customerId: number) {
  const list = state.poiOccupancy.get(poiId) ?? []
  list.push(customerId)
  state.poiOccupancy.set(poiId, list)
}

function vacatePOI(state: CafeState, poiId: string | null, customerId: number) {
  if (!poiId) return
  const list = state.poiOccupancy.get(poiId)
  if (!list) return
  const idx = list.indexOf(customerId)
  if (idx >= 0) list.splice(idx, 1)
}

function getBlockedPositions(state: CafeState, excludeId: number): Set<string> {
  const blocked = new Set<string>()
  for (const c of state.customers) {
    if (c.id === excludeId) continue
    if (c.phase === 'walking' || c.phase === 'entering') continue
    const gp = worldToGrid(c.worldPos)
    blocked.add(`${gp.row},${gp.col}`)
  }
  return blocked
}

function spawnCustomer(state: CafeState): void {
  const conversations = getConversations(state)
  const convoIndex = state.totalSpawned % conversations.length
  const conversation = conversations[convoIndex]

  const roster = getRoster(state)
  const characterId = roster[state.totalSpawned % roster.length] ?? ''
  const character = getCharacter(characterId)

  const customer: CustomerState = {
    id: state.nextId++,
    characterId,
    spriteVariant: character?.spriteVariant ?? (state.totalSpawned % CUSTOMER_SPRITES.length),
    phase: 'entering',
    worldPos: gridToWorld({ row: DOOR_ENTRY.row, col: DOOR_ENTRY.col + 2 }), // start off-screen right
    path: [],
    pathIndex: 0,
    currentPOI: null,
    targetPOI: null,
    facingDir: 'left',
    conversation,
    nextExchangeIndex: 0,
    exclamationTimer: null,
    idleTimer: null,
    stopsRemaining: Math.floor(randomBetween(STOPS_MIN, STOPS_MAX + 1)),
    hasActiveRequest: false,
  }

  // Find first destination
  const occupied = getBlockedPositions(state, customer.id)
  const poi = pickNextPOI(null, state.poiOccupancy, occupied)
  if (poi) {
    const blocked = getBlockedPositions(state, customer.id)
    customer.path = findPath(DOOR_ENTRY, poi.pos, blocked)
    customer.targetPOI = poi.id
    occupyPOI(state, poi.id, customer.id) // reserve immediately
    if (customer.path.length === 0) {
      // Fallback: walk to door entry and idle
      vacatePOI(state, poi.id, customer.id)
      customer.targetPOI = null
      customer.path = [DOOR_ENTRY]
    }
  } else {
    customer.path = [DOOR_ENTRY]
  }
  customer.pathIndex = 0

  state.customers.push(customer)
  state.totalSpawned++
}

function advanceAlongPath(customer: CustomerState, deltaMs: number): boolean {
  if (customer.path.length === 0) return true

  const targetGridPos = customer.path[customer.pathIndex]
  if (!targetGridPos) return true

  const targetWorld = gridToWorld(targetGridPos)
  const dx = targetWorld.x - customer.worldPos.x
  const dy = targetWorld.y - customer.worldPos.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  // Normalize speed to ~60fps (deltaMs / 16.67)
  const frameFactor = deltaMs / 16.67
  const speed = WALK_SPEED * frameFactor

  if (dist <= speed) {
    customer.worldPos.x = targetWorld.x
    customer.worldPos.y = targetWorld.y
    customer.pathIndex++

    // Update facing based on next path segment
    if (customer.pathIndex < customer.path.length) {
      const next = customer.path[customer.pathIndex]
      customer.facingDir = movementDirection(targetGridPos, next)
    }

    return customer.pathIndex >= customer.path.length
  }

  // Move one axis at a time (no diagonal movement)
  if (Math.abs(dx) > Math.abs(dy)) {
    // Move horizontally first
    const step = Math.min(speed, Math.abs(dx))
    customer.worldPos.x += Math.sign(dx) * step
    customer.facingDir = dx < 0 ? 'left' : 'right'
  } else {
    // Move vertically first
    const step = Math.min(speed, Math.abs(dy))
    customer.worldPos.y += Math.sign(dy) * step
    customer.facingDir = dy < 0 ? 'up' : 'down'
  }

  return false
}

function tickCustomer(customer: CustomerState, state: CafeState, deltaMs: number): void {
  switch (customer.phase) {
    case 'entering':
    case 'walking': {
      const arrived = advanceAlongPath(customer, deltaMs)
      if (arrived) {
        // Arrive at the POI (already reserved via occupyPOI on assignment)
        if (customer.targetPOI) {
          customer.currentPOI = customer.targetPOI
          customer.targetPOI = null
          // Face the POI's intended direction
          const poi = POINTS_OF_INTEREST.find(p => p.id === customer.currentPOI)
          if (poi) customer.facingDir = poi.facingDir
        }
        customer.phase = 'idle'
        customer.idleTimer = randomBetween(IDLE_MIN, IDLE_MAX)
      }
      break
    }

    case 'idle': {
      customer.idleTimer = (customer.idleTimer ?? 0) - deltaMs
      if (customer.idleTimer! <= 0) {
        // Decide: show exclamation or move on
        const hasExchanges = customer.nextExchangeIndex < customer.conversation.exchanges.length
        if (hasExchanges && Math.random() < EXCLAMATION_CHANCE) {
          customer.phase = 'exclamation'
          customer.exclamationTimer = EXCLAMATION_TIMEOUT
          customer.hasActiveRequest = true
        } else {
          moveToNextPOI(customer, state)
        }
      }
      break
    }

    case 'exclamation': {
      customer.exclamationTimer = (customer.exclamationTimer ?? 0) - deltaMs
      if (customer.exclamationTimer! <= 0) {
        // Timed out — dismiss exclamation, continue wandering
        customer.hasActiveRequest = false
        customer.phase = 'idle'
        customer.idleTimer = randomBetween(IDLE_MIN / 2, IDLE_MAX / 2)
      }
      break
    }

    case 'conversing':
      // Frozen — controlled by GameplayView
      break

    case 'post-convo': {
      customer.idleTimer = (customer.idleTimer ?? 0) - deltaMs
      if (customer.idleTimer! <= 0) {
        if (customer.stopsRemaining <= 0) {
          startExiting(customer, state)
        } else {
          moveToNextPOI(customer, state)
        }
      }
      break
    }

    case 'exiting': {
      const arrived = advanceAlongPath(customer, deltaMs)
      if (arrived) {
        // Walk off-screen to the right
        customer.worldPos.x += WALK_SPEED * (deltaMs / 16.67)
        // Remove when far enough off screen
        if (customer.worldPos.x > (DOOR_ENTRY.col + 3) * TILE_PX) {
          const idx = state.customers.indexOf(customer)
          if (idx >= 0) state.customers.splice(idx, 1)
          vacatePOI(state, customer.currentPOI, customer.id)
        }
      }
      break
    }
  }
}

function moveToNextPOI(customer: CustomerState, state: CafeState): void {
  vacatePOI(state, customer.currentPOI, customer.id)
  customer.stopsRemaining--

  if (customer.stopsRemaining <= 0) {
    startExiting(customer, state)
    return
  }

  const blocked = getBlockedPositions(state, customer.id)
  const poi = pickNextPOI(customer.currentPOI, state.poiOccupancy, blocked)
  if (!poi) {
    startExiting(customer, state)
    return
  }

  const currentGrid = worldToGrid(customer.worldPos)
  const path = findPath(currentGrid, poi.pos, blocked)

  if (path.length === 0) {
    // Can't reach — try exiting instead
    startExiting(customer, state)
    return
  }

  customer.currentPOI = null
  customer.targetPOI = poi.id
  occupyPOI(state, poi.id, customer.id) // reserve immediately
  customer.path = path
  customer.pathIndex = 0
  customer.phase = 'walking'
}

function startExiting(customer: CustomerState, state: CafeState): void {
  vacatePOI(state, customer.currentPOI, customer.id)
  customer.currentPOI = null
  state.dayAccumulator.customersServed++

  const currentGrid = worldToGrid(customer.worldPos)
  const blocked = getBlockedPositions(state, customer.id)
  const path = findPath(currentGrid, DOOR_ENTRY, blocked)
  if (path.length === 0) {
    // Shouldn't happen, but stay idle briefly and retry next cycle
    customer.phase = 'idle'
    customer.idleTimer = 1000
    customer.stopsRemaining = 0 // will retry exit after idle
    return
  }
  customer.path = path
  customer.pathIndex = 0
  customer.phase = 'exiting'
  customer.facingDir = 'right'
}

/**
 * Main simulation tick. Call every frame.
 */
export function tickCafe(state: CafeState, deltaMs: number): CafeTickResult {
  // Spawn timer
  if (state.totalSpawned < state.maxToSpawn && state.customers.length < MAX_IN_SHOP) {
    state.spawnTimer -= deltaMs
    if (state.spawnTimer <= 0) {
      spawnCustomer(state)
      state.spawnTimer = randomBetween(SPAWN_MIN, SPAWN_MAX)
    }
  }

  // Tick each customer (iterate in reverse for safe removal during exiting)
  for (let i = state.customers.length - 1; i >= 0; i--) {
    const customer = state.customers[i]
    if (customer) tickCustomer(customer, state, deltaMs)
  }

  // Day over?
  const dayOver = state.totalSpawned >= state.maxToSpawn && state.customers.length === 0

  return { dayOver }
}

/**
 * Start a conversation with a customer showing "!".
 */
export function startConversation(state: CafeState, customerId: number): ActiveConvo | null {
  if (state.activeConvo) return null

  const customer = state.customers.find(c => c.id === customerId)
  if (!customer || customer.phase !== 'exclamation') return null

  customer.phase = 'conversing'
  customer.hasActiveRequest = false
  customer.exclamationTimer = null

  const convo: ActiveConvo = {
    customerId,
    exchangeIndex: customer.nextExchangeIndex,
    hintLevel: 0,
    selectedChoiceId: null,
    result: null,
    showPhase: 'presenting',
    patienceStart: Date.now(),
  }

  state.activeConvo = convo
  return convo
}

/**
 * End the current conversation. Customer resumes wandering or exits.
 */
export function endConversation(state: CafeState): void {
  if (!state.activeConvo) return

  const customer = state.customers.find(c => c.id === state.activeConvo!.customerId)
  if (customer) {
    customer.nextExchangeIndex++
    customer.phase = 'post-convo'
    customer.idleTimer = POST_CONVO_PAUSE
  }

  state.activeConvo = null
}

/**
 * Record a conversation result into the day accumulator.
 */
export function recordResult(state: CafeState, score: Score, tipAmount: number): void {
  const acc = state.dayAccumulator
  acc.scores[score]++
  acc.coinsEarned += tipAmount
  if (score === 'PERFECT') acc.reputationChange++
  if (score === 'MISSED') acc.reputationChange--
}
