import { findPath, findOutsidePath, gridToWorld, worldToGrid, outsideGridToWorld, outsideWorldToGrid, movementDirection } from './pathfinding'
import { POINTS_OF_INTEREST, pickNextPOI, OUTSIDE_POIS, pickNextOutsidePOI } from './poi'
import { DOOR_ENTRY, TILE_SIZE, SCALE, OUTSIDE_SPAWN_TOP, OUTSIDE_SPAWN_BOTTOM, CAFE_DOOR_SIDEWALK, OUTSIDE_ROWS } from './tilemap'
import { CUSTOMER_SPRITES } from './sprites'
import { getCharacter } from './characters'
import type {
  WorldState,
  WorldTickResult,
  CustomerState,
  CustomerConversation,
  ActiveConvo,
} from './types'

const TILE_PX = TILE_SIZE * SCALE
const DEFAULT_MAX_IN_CAFE = 6
const DEFAULT_MAX_IN_WORLD = 12
const WALK_SPEED = 1.5 // pixels per frame
const SPAWN_MIN = 3000 // ms
const SPAWN_MAX = 6000
const IDLE_MIN = 5000
const IDLE_MAX = 12000
const OUTSIDE_IDLE_MIN = 3000
const OUTSIDE_IDLE_MAX = 8000
const EXCLAMATION_TIMEOUT = 15000 // ms
const EXCLAMATION_CHANCE = 0.6
const POST_CONVO_PAUSE = 500
const INTERIOR_STOPS_MIN = 2
const INTERIOR_STOPS_MAX = 5
const OUTSIDE_STOPS_MIN = 1
const OUTSIDE_STOPS_MAX = 3
const CAFE_ENTRY_CHANCE = 0.6 // chance to enter cafe after outside stops

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function createWorldState(maxInCafeBonus: number = 0): WorldState {
  return {
    characters: [],
    activeConvo: null,
    interiorPOIOccupancy: new Map(),
    outsidePOIOccupancy: new Map(),
    nextId: 0,
    spawnTimer: 1000,
    totalSpawned: 0,
    maxInWorld: DEFAULT_MAX_IN_WORLD,
    maxInCafe: DEFAULT_MAX_IN_CAFE + maxInCafeBonus,
  }
}

// Keep old name as alias
export const createCafeState = createWorldState

// --- POI occupancy helpers ---

function occupyInteriorPOI(state: WorldState, poiId: string, customerId: number) {
  const list = state.interiorPOIOccupancy.get(poiId) ?? []
  list.push(customerId)
  state.interiorPOIOccupancy.set(poiId, list)
}

function vacateInteriorPOI(state: WorldState, poiId: string | null, customerId: number) {
  if (!poiId) return
  const list = state.interiorPOIOccupancy.get(poiId)
  if (!list) return
  const idx = list.indexOf(customerId)
  if (idx >= 0) list.splice(idx, 1)
}

function occupyOutsidePOI(state: WorldState, poiId: string, customerId: number) {
  const list = state.outsidePOIOccupancy.get(poiId) ?? []
  list.push(customerId)
  state.outsidePOIOccupancy.set(poiId, list)
}

function vacateOutsidePOI(state: WorldState, poiId: string | null, customerId: number) {
  if (!poiId) return
  const list = state.outsidePOIOccupancy.get(poiId)
  if (!list) return
  const idx = list.indexOf(customerId)
  if (idx >= 0) list.splice(idx, 1)
}

// --- Blocked positions ---

function getInteriorBlocked(state: WorldState, excludeId: number): Set<string> {
  const blocked = new Set<string>()
  for (const c of state.characters) {
    if (c.id === excludeId || c.location !== 'interior') continue
    if (c.phase === 'walking' || c.phase === 'entering') continue
    const gp = worldToGrid(c.worldPos)
    blocked.add(`${gp.row},${gp.col}`)
  }
  return blocked
}

function getOutsideBlocked(state: WorldState, excludeId: number): Set<string> {
  const blocked = new Set<string>()
  for (const c of state.characters) {
    if (c.id === excludeId || c.location !== 'outside') continue
    if (c.phase === 'walking' || c.phase === 'entering') continue
    const gp = outsideWorldToGrid(c.outsideWorldPos)
    blocked.add(`${gp.row},${gp.col}`)
  }
  return blocked
}

function countInCafe(state: WorldState): number {
  return state.characters.filter(c => c.location === 'interior').length
}

// --- Movement ---

function advanceAlongPath(pos: { x: number; y: number }, path: { row: number; col: number }[], pathIndex: number, toWorld: (p: { row: number; col: number }) => { x: number; y: number }, deltaMs: number, facingDir: string): { arrived: boolean; newIndex: number; newFacing: string } {
  if (path.length === 0) return { arrived: true, newIndex: pathIndex, newFacing: facingDir }

  const targetGridPos = path[pathIndex]
  if (!targetGridPos) return { arrived: true, newIndex: pathIndex, newFacing: facingDir }

  const targetWorld = toWorld(targetGridPos)
  const dx = targetWorld.x - pos.x
  const dy = targetWorld.y - pos.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  const frameFactor = deltaMs / 16.67
  const speed = WALK_SPEED * frameFactor

  let newFacing = facingDir

  if (dist <= speed) {
    pos.x = targetWorld.x
    pos.y = targetWorld.y
    const newIndex = pathIndex + 1

    if (newIndex < path.length) {
      const next = path[newIndex]
      newFacing = movementDirection(targetGridPos, next)
    }

    return { arrived: newIndex >= path.length, newIndex, newFacing }
  }

  // Move one axis at a time
  if (Math.abs(dx) > Math.abs(dy)) {
    const step = Math.min(speed, Math.abs(dx))
    pos.x += Math.sign(dx) * step
    newFacing = dx < 0 ? 'left' : 'right'
  } else {
    const step = Math.min(speed, Math.abs(dy))
    pos.y += Math.sign(dy) * step
    newFacing = dy < 0 ? 'up' : 'down'
  }

  return { arrived: false, newIndex: pathIndex, newFacing }
}

// --- Spawn (on outside street) ---

export function spawnCharacter(
  state: WorldState,
  conversation: CustomerConversation,
  characterId: string,
): void {
  const character = getCharacter(characterId)

  // Spawn at top or bottom of outside map
  const fromTop = Math.random() < 0.5
  const spawnPos = fromTop ? OUTSIDE_SPAWN_TOP : OUTSIDE_SPAWN_BOTTOM

  const customer: CustomerState = {
    id: state.nextId++,
    characterId,
    spriteVariant: character?.spriteVariant ?? (state.totalSpawned % CUSTOMER_SPRITES.length),
    phase: 'walking',
    location: 'outside',
    worldPos: gridToWorld(DOOR_ENTRY), // placeholder for interior
    outsideWorldPos: outsideGridToWorld(spawnPos),
    path: [],
    pathIndex: 0,
    currentPOI: null,
    targetPOI: null,
    facingDir: fromTop ? 'down' : 'up',
    conversation,
    nextExchangeIndex: 0,
    exclamationTimer: null,
    idleTimer: null,
    stopsRemaining: Math.floor(randomBetween(INTERIOR_STOPS_MIN, INTERIOR_STOPS_MAX + 1)),
    outsideStopsRemaining: Math.floor(randomBetween(OUTSIDE_STOPS_MIN, OUTSIDE_STOPS_MAX + 1)),
    hasActiveRequest: false,
  }

  // Path to first outside POI
  const blocked = getOutsideBlocked(state, customer.id)
  const poi = pickNextOutsidePOI(null, state.outsidePOIOccupancy, blocked)
  if (poi) {
    customer.path = findOutsidePath(spawnPos, poi.pos, blocked)
    customer.targetPOI = poi.id
    occupyOutsidePOI(state, poi.id, customer.id)
    if (customer.path.length === 0) {
      vacateOutsidePOI(state, poi.id, customer.id)
      customer.targetPOI = null
      customer.path = [spawnPos]
    }
  } else {
    customer.path = [spawnPos]
  }
  customer.pathIndex = 0

  state.characters.push(customer)
  state.totalSpawned++
}

// Keep old name as alias
export const spawnCustomer = spawnCharacter

// --- Outside character tick ---

function tickOutsideCharacter(customer: CustomerState, state: WorldState, deltaMs: number): void {
  switch (customer.phase) {
    case 'entering':
    case 'walking': {
      const result = advanceAlongPath(customer.outsideWorldPos, customer.path, customer.pathIndex, outsideGridToWorld, deltaMs, customer.facingDir)
      customer.pathIndex = result.newIndex
      customer.facingDir = result.newFacing as CustomerState['facingDir']
      if (result.arrived) {
        // Check if we just arrived at cafe door — transition to interior
        const gridPos = outsideWorldToGrid(customer.outsideWorldPos)
        if (gridPos.row === CAFE_DOOR_SIDEWALK.row && gridPos.col === CAFE_DOOR_SIDEWALK.col && customer.targetPOI === '__cafe_door__') {
          transitionToInterior(customer, state)
          return
        }
        // Normal POI arrival
        if (customer.targetPOI) {
          customer.currentPOI = customer.targetPOI
          customer.targetPOI = null
          const poi = OUTSIDE_POIS.find(p => p.id === customer.currentPOI)
          if (poi) customer.facingDir = poi.facingDir
        }
        customer.phase = 'idle'
        customer.idleTimer = randomBetween(OUTSIDE_IDLE_MIN, OUTSIDE_IDLE_MAX)
      }
      break
    }

    case 'idle': {
      customer.idleTimer = (customer.idleTimer ?? 0) - deltaMs
      if (customer.idleTimer! <= 0) {
        customer.outsideStopsRemaining--
        if (customer.outsideStopsRemaining <= 0) {
          // Decide: enter cafe or leave world
          const cafeCount = countInCafe(state)
          if (cafeCount < state.maxInCafe && Math.random() < CAFE_ENTRY_CHANCE) {
            startEnteringCafe(customer, state)
          } else {
            startLeavingWorld(customer, state)
          }
        } else {
          moveToNextOutsidePOI(customer, state)
        }
      }
      break
    }

    case 'exiting': {
      // Walking off map edge
      const result = advanceAlongPath(customer.outsideWorldPos, customer.path, customer.pathIndex, outsideGridToWorld, deltaMs, customer.facingDir)
      customer.pathIndex = result.newIndex
      customer.facingDir = result.newFacing as CustomerState['facingDir']
      if (result.arrived) {
        // Walk further off-screen, then remove
        const frameFactor = deltaMs / 16.67
        customer.outsideWorldPos.y += (customer.facingDir === 'up' ? -1 : 1) * WALK_SPEED * frameFactor
        if (customer.outsideWorldPos.y < -TILE_PX || customer.outsideWorldPos.y > (OUTSIDE_ROWS + 1) * TILE_PX) {
          const idx = state.characters.indexOf(customer)
          if (idx >= 0) state.characters.splice(idx, 1)
          vacateOutsidePOI(state, customer.currentPOI, customer.id)
        }
      }
      break
    }

    default:
      break
  }
}

function moveToNextOutsidePOI(customer: CustomerState, state: WorldState): void {
  vacateOutsidePOI(state, customer.currentPOI, customer.id)

  const blocked = getOutsideBlocked(state, customer.id)
  const poi = pickNextOutsidePOI(customer.currentPOI, state.outsidePOIOccupancy, blocked)
  if (!poi) {
    startLeavingWorld(customer, state)
    return
  }

  const currentGrid = outsideWorldToGrid(customer.outsideWorldPos)
  const path = findOutsidePath(currentGrid, poi.pos, blocked)
  if (path.length === 0) {
    startLeavingWorld(customer, state)
    return
  }

  customer.currentPOI = null
  customer.targetPOI = poi.id
  occupyOutsidePOI(state, poi.id, customer.id)
  customer.path = path
  customer.pathIndex = 0
  customer.phase = 'walking'
}

function startEnteringCafe(customer: CustomerState, state: WorldState): void {
  vacateOutsidePOI(state, customer.currentPOI, customer.id)
  customer.currentPOI = null

  const currentGrid = outsideWorldToGrid(customer.outsideWorldPos)
  const blocked = getOutsideBlocked(state, customer.id)
  const path = findOutsidePath(currentGrid, CAFE_DOOR_SIDEWALK, blocked)
  if (path.length === 0) {
    // Can't reach door, leave instead
    startLeavingWorld(customer, state)
    return
  }

  customer.targetPOI = '__cafe_door__'
  customer.path = path
  customer.pathIndex = 0
  customer.phase = 'walking'
}

function transitionToInterior(customer: CustomerState, state: WorldState): void {
  customer.location = 'interior'
  customer.worldPos = gridToWorld({ row: DOOR_ENTRY.row, col: DOOR_ENTRY.col + 2 }) // start just outside door
  customer.phase = 'entering'
  customer.facingDir = 'left'
  customer.targetPOI = null
  customer.stopsRemaining = Math.floor(randomBetween(INTERIOR_STOPS_MIN, INTERIOR_STOPS_MAX + 1))

  // Find first interior destination
  const blocked = getInteriorBlocked(state, customer.id)
  const poi = pickNextPOI(null, state.interiorPOIOccupancy, blocked)
  if (poi) {
    customer.path = findPath(DOOR_ENTRY, poi.pos, blocked)
    customer.targetPOI = poi.id
    occupyInteriorPOI(state, poi.id, customer.id)
    if (customer.path.length === 0) {
      vacateInteriorPOI(state, poi.id, customer.id)
      customer.targetPOI = null
      customer.path = [DOOR_ENTRY]
    }
  } else {
    customer.path = [DOOR_ENTRY]
  }
  customer.pathIndex = 0
}

function transitionToOutside(customer: CustomerState, state: WorldState): void {
  vacateInteriorPOI(state, customer.currentPOI, customer.id)
  customer.currentPOI = null
  customer.location = 'outside'
  customer.outsideWorldPos = outsideGridToWorld(CAFE_DOOR_SIDEWALK)
  customer.facingDir = 'right'

  // Either wander outside more or leave
  if (Math.random() < 0.3) {
    // Wander outside a bit more
    customer.outsideStopsRemaining = Math.floor(randomBetween(1, 3))
    customer.phase = 'idle'
    customer.idleTimer = randomBetween(OUTSIDE_IDLE_MIN / 2, OUTSIDE_IDLE_MAX / 2)
  } else {
    startLeavingWorld(customer, state)
  }
}

function startLeavingWorld(customer: CustomerState, state: WorldState): void {
  vacateOutsidePOI(state, customer.currentPOI, customer.id)
  customer.currentPOI = null

  const currentGrid = outsideWorldToGrid(customer.outsideWorldPos)
  // Head to nearest map edge (top or bottom)
  const target = currentGrid.row < OUTSIDE_ROWS / 2 ? OUTSIDE_SPAWN_TOP : OUTSIDE_SPAWN_BOTTOM
  const blocked = getOutsideBlocked(state, customer.id)
  const path = findOutsidePath(currentGrid, target, blocked)

  if (path.length === 0) {
    // Force remove if truly stuck
    const idx = state.characters.indexOf(customer)
    if (idx >= 0) state.characters.splice(idx, 1)
    return
  }

  customer.path = path
  customer.pathIndex = 0
  customer.phase = 'exiting'
  customer.facingDir = target.row === 0 ? 'up' : 'down'
}

// --- Interior character tick (adapted from old tickCustomer) ---

function tickInteriorCharacter(customer: CustomerState, state: WorldState, deltaMs: number): void {
  switch (customer.phase) {
    case 'entering':
    case 'walking': {
      const result = advanceAlongPath(customer.worldPos, customer.path, customer.pathIndex, gridToWorld, deltaMs, customer.facingDir)
      customer.pathIndex = result.newIndex
      customer.facingDir = result.newFacing as CustomerState['facingDir']
      if (result.arrived) {
        if (customer.targetPOI) {
          customer.currentPOI = customer.targetPOI
          customer.targetPOI = null
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
        const hasExchanges = customer.nextExchangeIndex < customer.conversation.exchanges.length
        if (hasExchanges && Math.random() < EXCLAMATION_CHANCE) {
          customer.phase = 'exclamation'
          customer.exclamationTimer = EXCLAMATION_TIMEOUT
          customer.hasActiveRequest = true
        } else {
          moveToNextInteriorPOI(customer, state)
        }
      }
      break
    }

    case 'exclamation': {
      customer.exclamationTimer = (customer.exclamationTimer ?? 0) - deltaMs
      if (customer.exclamationTimer! <= 0) {
        customer.hasActiveRequest = false
        customer.phase = 'idle'
        customer.idleTimer = randomBetween(IDLE_MIN / 2, IDLE_MAX / 2)
      }
      break
    }

    case 'conversing':
      break

    case 'post-convo': {
      customer.idleTimer = (customer.idleTimer ?? 0) - deltaMs
      if (customer.idleTimer! <= 0) {
        if (customer.stopsRemaining <= 0) {
          startInteriorExiting(customer, state)
        } else {
          moveToNextInteriorPOI(customer, state)
        }
      }
      break
    }

    case 'exiting': {
      const result = advanceAlongPath(customer.worldPos, customer.path, customer.pathIndex, gridToWorld, deltaMs, customer.facingDir)
      customer.pathIndex = result.newIndex
      customer.facingDir = result.newFacing as CustomerState['facingDir']
      if (result.arrived) {
        // Walk past door, then transition to outside
        customer.worldPos.x += WALK_SPEED * (deltaMs / 16.67)
        if (customer.worldPos.x > (DOOR_ENTRY.col + 3) * TILE_PX) {
          transitionToOutside(customer, state)
        }
      }
      break
    }
  }
}

function moveToNextInteriorPOI(customer: CustomerState, state: WorldState): void {
  vacateInteriorPOI(state, customer.currentPOI, customer.id)
  customer.stopsRemaining--

  if (customer.stopsRemaining <= 0) {
    startInteriorExiting(customer, state)
    return
  }

  const blocked = getInteriorBlocked(state, customer.id)
  const poi = pickNextPOI(customer.currentPOI, state.interiorPOIOccupancy, blocked)
  if (!poi) {
    startInteriorExiting(customer, state)
    return
  }

  const currentGrid = worldToGrid(customer.worldPos)
  const path = findPath(currentGrid, poi.pos, blocked)

  if (path.length === 0) {
    startInteriorExiting(customer, state)
    return
  }

  customer.currentPOI = null
  customer.targetPOI = poi.id
  occupyInteriorPOI(state, poi.id, customer.id)
  customer.path = path
  customer.pathIndex = 0
  customer.phase = 'walking'
}

function startInteriorExiting(customer: CustomerState, state: WorldState): void {
  vacateInteriorPOI(state, customer.currentPOI, customer.id)
  customer.currentPOI = null

  const currentGrid = worldToGrid(customer.worldPos)
  const blocked = getInteriorBlocked(state, customer.id)
  const path = findPath(currentGrid, DOOR_ENTRY, blocked)
  if (path.length === 0) {
    customer.phase = 'idle'
    customer.idleTimer = 1000
    customer.stopsRemaining = 0
    return
  }
  customer.path = path
  customer.pathIndex = 0
  customer.phase = 'exiting'
  customer.facingDir = 'right'
}

// --- Main tick ---

export function tickWorld(state: WorldState, deltaMs: number): WorldTickResult {
  let shouldSpawn = false

  // Spawn timer
  if (state.characters.length < state.maxInWorld) {
    state.spawnTimer -= deltaMs
    if (state.spawnTimer <= 0) {
      shouldSpawn = true
      state.spawnTimer = randomBetween(SPAWN_MIN, SPAWN_MAX)
    }
  }

  // Tick each character (reverse for safe removal)
  for (let i = state.characters.length - 1; i >= 0; i--) {
    const customer = state.characters[i]
    if (!customer) continue
    if (customer.location === 'outside') {
      tickOutsideCharacter(customer, state, deltaMs)
    } else {
      tickInteriorCharacter(customer, state, deltaMs)
    }
  }

  return { shouldSpawn }
}

// Keep old name as alias
export const tickCafe = tickWorld

// --- Conversation management (unchanged, only works for interior characters) ---

export function startConversation(state: WorldState, customerId: number): ActiveConvo | null {
  if (state.activeConvo) return null

  const customer = state.characters.find(c => c.id === customerId && c.location === 'interior')
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

export function endConversation(state: WorldState): void {
  if (!state.activeConvo) return

  const customer = state.characters.find(c => c.id === state.activeConvo!.customerId)
  if (customer) {
    customer.nextExchangeIndex++
    customer.phase = 'post-convo'
    customer.idleTimer = POST_CONVO_PAUSE
  }

  state.activeConvo = null
}
