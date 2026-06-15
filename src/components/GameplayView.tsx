'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  AnswerChoice, ResolvedExchange, Score,
  EvaluationResult, PlayerState, WorldState,
  Expression, FurnishingItem, GridPos,
} from '../lib/types'
import { evaluateChoice, generateSingleConversation, generateWordQuiz, QuizMode } from '../lib/game'
import { updateMastery } from '../lib/state'
import type { UpgradeBonuses } from '../lib/upgrades'
import { TILE_TO_UPGRADE_ID, getUpgradeCatalogEntry, getUpgradeTimeRemaining, formatTimeRemaining } from '../lib/upgrades'
import { createWorldState, tickWorld, startConversation, endConversation, spawnScriptedActor } from '../lib/cafe-sim'
import { getLevel, starsForCoins, isLevelUnlocked, customerCount, type Level } from '../lib/levels'
import { PATIO_UNLOCK_REP, PATIO_UNLOCK_COST } from '../lib/tilemap'
import { buildPlacedTileMap, buildFurnishingPOIs, getAvailableSlots, ALL_FURNISHINGS } from '../lib/furnishing'
import { getCharacter, getFriendshipLevel, FRIENDSHIP_GAIN, VoiceProfile } from '../lib/characters'
import { CUSTOMER_SPRITES, CUSTOMER_FACES, PALETTE, type FaceEmotion } from '../lib/sprites'
import { updateQuestProgress, updateConversationEndProgress, hasClaimableQuest as checkClaimableQuest, QuestEvent } from '../lib/quests'
import HUD from './HUD'
import CafeCanvas from './CafeCanvas'
import ContactsView from './ContactsView'
import UpgradeShop from './UpgradeShop'
import DictionaryView from './DictionaryView'
import QuestsView from './QuestsView'
import LevelSelectView from './LevelSelectView'
import SessionSummary, { type SessionResult } from './SessionSummary'

interface GameplayViewProps {
  expressions: Expression[]
  playerState: PlayerState
  bonuses: UpgradeBonuses
  readyToInstallIds: string[]
  onStateUpdate: (updates: Partial<PlayerState>) => void
  onFriendshipGain: (characterId: string, score: string) => void
  onPurchase: (upgradeId: string, tier: number, cost: number, durationMs: number) => void
  onInstall: (upgradeId: string) => void
  onFinishUpgrade: (upgradeId: string) => void
  onFurnishingPurchase: (itemId: string, tier: number, cost: number, durationMs: number) => void
  onFurnishingInstall: (itemId: string) => void
  onFurnishingFinish: (itemId: string) => void
  onDebugSet: (field: 'coins' | 'reputation', value: number) => void
  onReset: () => void
}

const PATIENCE_DURATION = 20_000

function renderCustomerLine(line: string): React.ReactNode {
  const parts = line.split(/(\{[^}]+\})/)
  if (parts.length === 1) return line
  return parts.map((part, i) =>
    part.startsWith('{') && part.endsWith('}')
      ? <span key={i} style={{ fontWeight: 800, color: '#8B4513' }}>[{part.slice(1, -1)}]</span>
      : <span key={i}>{part}</span>
  )
}

let _audioCtx: AudioContext | null = null
function getAudioCtx(): AudioContext {
  if (!_audioCtx) _audioCtx = new AudioContext()
  if (_audioCtx.state === 'suspended') _audioCtx.resume()
  return _audioCtx
}

// Unlock audio on first user interaction (iOS requirement)
if (typeof window !== 'undefined') {
  const unlock = () => {
    getAudioCtx()
    if (_awwAudio) { _awwAudio.play().then(() => { _awwAudio!.pause(); _awwAudio!.currentTime = 0 }).catch(() => { }) }
    window.removeEventListener('touchstart', unlock)
    window.removeEventListener('click', unlock)
  }
  window.addEventListener('touchstart', unlock, { once: true })
  window.addEventListener('click', unlock, { once: true })
}

function playCoinSound() {
  if (typeof window === 'undefined') return
  const ctx = getAudioCtx()
  const now = ctx.currentTime
  // Two quick ascending tones
  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = i === 0 ? 987 : 1319 // B5, E6
    gain.gain.setValueAtTime(0.08, now + i * 0.08)
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now + i * 0.08)
    osc.stop(now + i * 0.08 + 0.12)
  }
}

let _awwAudio: HTMLAudioElement | null = null
if (typeof window !== 'undefined') {
  _awwAudio = new Audio('/aww.mp3')
  _awwAudio.preload = 'auto'
}
function playAwwSound() {
  if (typeof window === 'undefined' || !_awwAudio) return
  _awwAudio.currentTime = 0
  _awwAudio.play().catch(() => { })
}

export function playTapSound() {
  if (typeof window === 'undefined') return
  const ctx = getAudioCtx()
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = 660 // E5
  gain.gain.setValueAtTime(0.06, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.1)
}

export function playUpgradeStartSound() {
  if (typeof window === 'undefined') return
  const ctx = getAudioCtx()
  const now = ctx.currentTime
  // Rising three-note arpeggio
  const freqs = [523, 659, 784] // C5, E5, G5
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freqs[i]
    gain.gain.setValueAtTime(0.07, now + i * 0.08)
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now + i * 0.08)
    osc.stop(now + i * 0.08 + 0.15)
  }
}

function playUpgradeReadySound() {
  if (typeof window === 'undefined') return
  const ctx = getAudioCtx()
  const now = ctx.currentTime
  // Bright notification chime — two notes
  const freqs = [784, 1047] // G5, C6
  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freqs[i]
    gain.gain.setValueAtTime(0.1, now + i * 0.12)
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now + i * 0.12)
    osc.stop(now + i * 0.12 + 0.25)
  }
}

export function playInstallSound() {
  if (typeof window === 'undefined') return
  const ctx = getAudioCtx()
  const now = ctx.currentTime
  // Satisfying descending sparkle — four quick notes
  const freqs = [1319, 1047, 784, 1047] // E6, C6, G5, C6
  for (let i = 0; i < 4; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freqs[i]
    gain.gain.setValueAtTime(0.08, now + i * 0.07)
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.18)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now + i * 0.07)
    osc.stop(now + i * 0.07 + 0.18)
  }
}

function spriteToDataURL(spriteVariant: number, size: number): string {
  const sprites = CUSTOMER_SPRITES[spriteVariant % CUSTOMER_SPRITES.length]
  const sprite = sprites.down
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const scale = size / 32
  const s = Math.ceil(scale)
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const idx = sprite[row][col]
      if (idx === 0) continue
      ctx.fillStyle = PALETTE[idx]
      ctx.fillRect(col * scale, row * scale, s, s)
    }
  }
  return canvas.toDataURL()
}

const faceCache = new Map<string, string>()
function faceToDataURL(spriteVariant: number, emotion: FaceEmotion, size: number): string {
  const key = `${spriteVariant}-${emotion}-${size}`
  const cached = faceCache.get(key)
  if (cached) return cached
  const faces = CUSTOMER_FACES[spriteVariant % CUSTOMER_FACES.length]
  const sprite = faces[emotion]
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const scale = size / 24
  const s = Math.ceil(scale)
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const idx = sprite[row][col]
      if (idx === 0) continue
      ctx.fillStyle = PALETTE[idx]
      ctx.fillRect(col * scale, row * scale, s, s)
    }
  }
  const url = canvas.toDataURL()
  faceCache.set(key, url)
  return url
}

// Cache French voices (male + female)
let cachedMaleVoice: SpeechSynthesisVoice | null = null
let cachedFemaleVoice: SpeechSynthesisVoice | null = null
let voicesLoaded = false

function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return
  voicesLoaded = true
  const germanVoices = voices.filter(v => v.lang.startsWith('de'))
  cachedMaleVoice =
    germanVoices.find(v => /martin|male|mann/i.test(v.name)) ??
    germanVoices.find(v => !/female|frau|anna|petra|marlene|helena|vicki/i.test(v.name)) ??
    germanVoices[0] ??
    null
  cachedFemaleVoice =
    germanVoices.find(v => /anna|petra|female|frau|marlene|helena|vicki/i.test(v.name)) ??
    germanVoices.find(v => v !== cachedMaleVoice) ??
    germanVoices[0] ??
    null
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}

function speakFrench(text: string, gender: 'male' | 'female' = 'male', profile?: VoiceProfile): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) { resolve(); return }
    if (!voicesLoaded) loadVoices()
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'de-DE'
    // Apply voice profile with slight random jitter per utterance
    const jitterP = (Math.random() - 0.5) * 0.06 // ±0.03
    const jitterR = (Math.random() - 0.5) * 0.04 // ±0.02
    utterance.pitch = Math.max(0.5, Math.min(2, (profile?.pitch ?? 1.0) + jitterP))
    utterance.rate = Math.max(0.5, Math.min(2, (profile?.rate ?? 0.85) + jitterR))
    utterance.volume = profile?.volume ?? 1.0
    const voice = gender === 'female' ? cachedFemaleVoice : cachedMaleVoice
    if (voice) utterance.voice = voice
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
}

function spawnFlyingCoins(count: number) {
  const container = document.getElementById('game-container')
  if (!container) return
  const rect = container.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height * 0.5
  const tx = rect.left + 30
  const ty = rect.top + 10

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    el.textContent = '🟡'
    const sx = cx + (Math.random() - 0.5) * 60
    const sy = cy + (Math.random() - 0.5) * 30
    Object.assign(el.style, {
      position: 'fixed',
      left: `${sx}px`,
      top: `${sy}px`,
      zIndex: '9999',
      pointerEvents: 'none',
      fontSize: '24px',
      transition: `transform 0.7s ease-in, opacity 0.5s ease-in 0.2s`,
      transform: 'scale(1)',
      opacity: '1',
    })
    document.body.appendChild(el)

    // Trigger animation on next frame
    requestAnimationFrame(() => {
      el.style.transform = `translate(${tx - sx}px, ${ty - sy}px) scale(0.3)`
      el.style.opacity = '0'
    })

    // Remove from DOM after animation
    setTimeout(() => el.remove(), 900)
  }
}

export default function GameplayView({
  expressions,
  playerState,
  bonuses,
  readyToInstallIds,
  onStateUpdate,
  onFriendshipGain,
  onPurchase,
  onInstall,
  onFinishUpgrade,
  onFurnishingPurchase,
  onFurnishingInstall,
  onFurnishingFinish,
  onDebugSet,
  onReset,
}: GameplayViewProps) {
  // Simulation state (mutable ref, no re-renders on frame updates)
  const cafeStateRef = useRef<WorldState | null>(null)
  const lastFrameRef = useRef(0)

  // Refs for on-demand spawning
  const playerStateRef = useRef(playerState)
  playerStateRef.current = playerState

  // React state for UI updates
  const [activeExchange, setActiveExchange] = useState<ResolvedExchange | null>(null)
  const [responding, setResponding] = useState(false)
  const [lastResult, setLastResult] = useState<EvaluationResult | null>(null)
  const [lastPenalty, setLastPenalty] = useState<{ coins: number; rep: number } | null>(null)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [hintLevel, setHintLevel] = useState(0)
  const [patiencePercent, setPatiencePercent] = useState(100)
  const [activeCharacterName, setActiveCharacterName] = useState<string | null>(null)
  const [activeSpriteVariant, setActiveSpriteVariant] = useState<number>(0)

  // Session / level state
  const [activeLevel, setActiveLevel] = useState<Level | null>(null)
  const [showLevelSelect, setShowLevelSelect] = useState(false)
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null)
  const [sessionProgress, setSessionProgress] = useState<{ served: number; coins: number }>({ served: 0, coins: 0 })
  const sessionRef = useRef<{
    level: Level
    target: number          // number of NPCs in this session
    actorsSpawned: number   // how many have been spawned so far
    actorsServed: number    // how many have finished their last request (and are leaving)
    coinsEarned: number     // net coins this session
  } | null>(null)
  const activeGenderRef = useRef<'male' | 'female'>('male')
  const activeVoiceRef = useRef<VoiceProfile | undefined>(undefined)
  const [friendshipGain, setFriendshipGain] = useState<number | null>(null)
  const [inspectedCharacterId, setInspectedCharacterId] = useState<string | null>(null)
  const [showContacts, setShowContacts] = useState(false)
  const [showUpgradeShop, setShowUpgradeShop] = useState(false)
  const [showDictionary, setShowDictionary] = useState(false)
  const [showPatioPrompt, setShowPatioPrompt] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showQuests, setShowQuests] = useState(false)
  const quizMode: QuizMode = 'sentence'
  const [musicVolume, setMusicVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('coffee-lingo-volume')
      return saved !== null ? Number(saved) : 0.3
    }
    return 0.3
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Refs for callback stability
  const respondingRef = useRef(false)
  const processingRef = useRef(false)
  const hintLevelRef = useRef(0)
  const patienceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const patioUnlocked = playerState.unlockedRooms?.includes('patio') ?? false
  const [patioUnlockToast, setPatioUnlockToast] = useState(false)
  const [placingItem, setPlacingItem] = useState<FurnishingItem | null>(null)
  const [inspectedFurnishingId, setInspectedFurnishingId] = useState<string | null>(null)
  const [wordDetailExpr, setWordDetailExpr] = useState<Expression | null>(null)
  const [, setTickInspect] = useState(0)

  // Live timer tick for furnishing inspection popup
  useEffect(() => {
    if (!inspectedFurnishingId) return
    const id = setInterval(() => setTickInspect(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [inspectedFurnishingId])

  // Build tile overrides and patio POIs from placed furnishings
  const placedFurnishings = playerState.placedFurnishings ?? {}
  const tileOverrides = useMemo(() => buildPlacedTileMap(placedFurnishings), [placedFurnishings])
  const patioPOIs = useMemo(() => buildFurnishingPOIs(tileOverrides), [tileOverrides])

  // Compute available placement slots for current item
  const placingSlots = useMemo(() => {
    if (!placingItem) return []
    return getAvailableSlots(placingItem, placedFurnishings)
  }, [placingItem, placedFurnishings])

  // Play sound when a new upgrade becomes ready
  const prevReadyCountRef = useRef(readyToInstallIds.length)
  useEffect(() => {
    if (readyToInstallIds.length > prevReadyCountRef.current) {
      playUpgradeReadySound()
    }
    prevReadyCountRef.current = readyToInstallIds.length
  }, [readyToInstallIds])

  // Keep simulation state in sync with player state
  useEffect(() => {
    if (cafeStateRef.current) {
      cafeStateRef.current.patioUnlocked = patioUnlocked
      cafeStateRef.current.tileOverrides = tileOverrides
      cafeStateRef.current.patioPOIs = patioPOIs
    }
  }, [patioUnlocked, tileOverrides, patioPOIs])

  const handlePatioUnlock = useCallback(() => {
    onStateUpdate({
      unlockedRooms: [...(playerState.unlockedRooms ?? []), 'patio'],
      coins: Math.round(playerState.coins - PATIO_UNLOCK_COST),
    })
    setPatioUnlockToast(true)
    setTimeout(() => setPatioUnlockToast(false), 3000)
  }, [onStateUpdate, playerState.unlockedRooms, playerState.coins])

  const handleFurnishingBuy = useCallback((item: FurnishingItem) => {
    setPlacingItem(item)
    setShowUpgradeShop(false)
  }, [])

  const handleFurnishingPlace = useCallback((pos: GridPos) => {
    if (!placingItem) return
    onStateUpdate({
      coins: Math.round(playerState.coins - placingItem.cost),
      placedFurnishings: { ...placedFurnishings, [placingItem.id]: pos },
    })
    setPlacingItem(null)
  }, [placingItem, placedFurnishings, playerState.coins, onStateUpdate])

  // --- Session lifecycle ---

  function clearWorld(state: WorldState) {
    state.characters = []
    state.interiorPOIOccupancy.clear()
    state.outsidePOIOccupancy.clear()
    state.activeConvo = null
  }

  const startSession = useCallback((level: Level) => {
    const state = cafeStateRef.current
    if (!state) return
    clearWorld(state)
    state.spawnTimer = 600 // first customer arrives quickly
    sessionRef.current = {
      level,
      target: customerCount(level),
      actorsSpawned: 0,
      actorsServed: 0,
      coinsEarned: 0,
    }
    setSessionProgress({ served: 0, coins: 0 })
    setSessionResult(null)
    setShowLevelSelect(false)
    setActiveLevel(level)
  }, [])

  const endSession = useCallback(() => {
    const session = sessionRef.current
    if (!session) return
    const { level } = session
    const netCoins = Math.round(session.coinsEarned)
    const stars = starsForCoins(level, netCoins)

    const ps = playerStateRef.current
    const prevProgress = ps.levelProgress ?? {}
    const wasNextUnlocked = isLevelUnlocked(level.id + 1, prevProgress)
    const prev = prevProgress[level.id]
    const bestStars = Math.max(prev?.stars ?? 0, stars)
    const bestCoins = Math.max(prev?.bestCoins ?? 0, netCoins)
    const updatedProgress = {
      ...prevProgress,
      [level.id]: { stars: bestStars, bestCoins },
    }
    onStateUpdate({ levelProgress: updatedProgress })

    const nextLevel = getLevel(level.id + 1) ?? null
    const nextUnlocked = isLevelUnlocked(level.id + 1, updatedProgress)
    const newlyUnlocked = !wasNextUnlocked && nextUnlocked ? nextLevel : null

    // Stop the session and clear the floor
    sessionRef.current = null
    setActiveLevel(null)
    const state = cafeStateRef.current
    if (state) clearWorld(state)

    setSessionResult({ level, coins: netCoins, stars, newlyUnlocked, nextLevel, nextUnlocked, bestCoins, bestStars })
  }, [onStateUpdate])

  // Called when a scripted NPC finishes (or abandons) a request. If it was their
  // last request, they're done being served and about to leave the shop, so the
  // "customers left" counter drops; when all are served, the session ends.
  const markRequestComplete = useCallback((customer: import('../lib/types').CustomerState) => {
    const plan = customer.requestPlan
    const session = sessionRef.current
    if (!plan || !session) return
    const isLastRequest = (customer.requestIndex ?? 0) + 1 >= plan.length
    if (!isLastRequest) return
    session.actorsServed += 1
    setSessionProgress({ served: session.actorsServed, coins: Math.round(session.coinsEarned) })
    if (session.actorsServed >= session.target) {
      endSession()
    }
  }, [endSession])

  // End the day early — scores whatever coins were earned so far.
  const handleEndSession = useCallback(() => {
    if (!sessionRef.current) return
    if (!window.confirm('End the day now? Your stars are based on coins earned so far.')) return
    setActiveExchange(null)
    setLastResult(null)
    setSelectedChoiceId(null)
    setResponding(false)
    respondingRef.current = false
    processingRef.current = false
    endSession()
  }, [endSession])

  // Initialize simulation once on mount
  useEffect(() => {
    const state = createWorldState(0, patioUnlocked, tileOverrides, patioPOIs)
    cafeStateRef.current = state
    lastFrameRef.current = performance.now()

    // Initialize audio
    const audio = new Audio('/coffee_track.mp3')
    audio.loop = true
    audio.volume = musicVolume
    audioRef.current = audio

    // Autoplay is blocked by browsers until first user interaction
    function startAudio() {
      if (audio.volume > 0) audio.play().catch(() => { })
      document.removeEventListener('pointerdown', startAudio)
    }
    document.addEventListener('pointerdown', startAudio)

    return () => { audio.pause(); audio.src = ''; document.removeEventListener('pointerdown', startAudio) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSceneChange = useCallback((scene: 'interior' | 'outside') => {
    const audio = audioRef.current
    if (!audio) return
    if (scene === 'interior' && audio.volume > 0) {
      audio.play().catch(() => { })
    } else {
      audio.pause()
    }
  }, [musicVolume])

  const handleVolumeChange = useCallback((vol: number) => {
    setMusicVolume(vol)
    localStorage.setItem('coffee-lingo-volume', String(vol))
    const audio = audioRef.current
    if (audio) {
      audio.volume = vol
      if (vol === 0) { audio.pause() } else { audio.play().catch(() => { }) }
    }
  }, [])

  // Simulation loop with on-demand spawning
  useEffect(() => {
    let running = true

    function loop() {
      if (!running) return
      const state = cafeStateRef.current
      if (!state) {
        requestAnimationFrame(loop)
        return
      }

      const now = performance.now()
      const deltaMs = Math.min(now - lastFrameRef.current, 100)
      lastFrameRef.current = now

      const result = tickWorld(state, deltaMs)

      const session = sessionRef.current
      if (session) {
        // Spawn the next scripted actor — a few can be in the shop at once.
        const MAX_CONCURRENT = 3
        if (
          result.shouldSpawn &&
          session.actorsSpawned < session.target &&
          state.characters.length < MAX_CONCURRENT
        ) {
          const ps = playerStateRef.current
          const actor = session.level.actors[session.actorsSpawned]

          // Pre-generate the first question for each request stop (content varies each run).
          const convos = []
          let recency = ps.recencyBuffer
          for (let k = 0; k < actor.requests.length; k++) {
            const { conversation, usedWordId } = generateSingleConversation(
              expressions, ps.vocabulary, recency, ps.wrongQueue ?? [], quizMode
            )
            convos.push(conversation)
            recency = [...recency, usedWordId].slice(-10)
          }

          spawnScriptedActor(state, actor.characterId, actor.requests, convos)
          session.actorsSpawned++
          if (recency.join() !== ps.recencyBuffer.join()) {
            onStateUpdate({ recencyBuffer: recency })
          }
        }
      }

      requestAnimationFrame(loop)
    }

    requestAnimationFrame(loop)
    return () => { running = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Patience timer — CSS transition handles the animation, single timeout for expiry
  const patienceDuration = PATIENCE_DURATION
  useEffect(() => {
    if (!activeExchange || !responding) {
      if (patienceTimeoutRef.current) clearTimeout(patienceTimeoutRef.current)
      setPatiencePercent(100)
      return
    }

    // Start at 100%, then immediately set to 0% — CSS transition animates it
    setPatiencePercent(100)
    requestAnimationFrame(() => {
      setPatiencePercent(0)
    })

    // Single timeout for when patience runs out
    const timeoutId = setTimeout(() => {
      if (respondingRef.current && !processingRef.current) {
        setSelectedChoiceId('timeout')
        processResult(null)
      }
    }, patienceDuration)
    patienceTimeoutRef.current = timeoutId

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExchange, responding])

  const handleCustomerTap = useCallback((customerId: number) => {
    const state = cafeStateRef.current
    if (!state || state.activeConvo) return

    const convo = startConversation(state, customerId)
    if (!convo) return

    const customer = state.characters.find(c => c.id === customerId)
    if (!customer) return

    const exchange = customer.conversation.exchanges[convo.exchangeIndex]
    if (!exchange) return

    const charData = getCharacter(customer.characterId)
    setActiveCharacterName(charData?.name ?? null)
    setActiveSpriteVariant(customer.spriteVariant)
    activeGenderRef.current = charData?.gender ?? 'male'
    activeVoiceRef.current = charData?.voice
    setActiveExchange(exchange)
    setLastResult(null)
    setSelectedChoiceId(null)
    setHintLevel(0)
    hintLevelRef.current = 0
    setResponding(true)
    respondingRef.current = true
    processingRef.current = false
    setPatiencePercent(100)
    // customerLine is now English — don't speak it in French
  }, [])

  const processResult = useCallback((choice: AnswerChoice | null) => {
    if (processingRef.current) return
    processingRef.current = true
    respondingRef.current = false
    setResponding(false)

    const state = cafeStateRef.current
    if (!state || !state.activeConvo) return

    const customer = state.characters.find(c => c.id === state.activeConvo!.customerId)
    if (!customer) return

    const exchange = customer.conversation.exchanges[state.activeConvo.exchangeIndex]
    if (!exchange) return

    const result: EvaluationResult = choice
      ? evaluateChoice(choice, hintLevelRef.current, bonuses)
      : { score: 'MISSED' as Score, coveredRequired: [], coveredBonus: [], tipAmount: 0 }

    setLastResult(result)

    // Spawn flying coins animation
    if (result.tipAmount > 0) {
      spawnFlyingCoins(Math.min(result.tipAmount, 8))
    }

    if (result.score === 'PERFECT' || result.score === 'GOOD') playCoinSound()
    if (result.score === 'MISSED') playAwwSound()

    // Show friendship gain + update immediately
    const gain = FRIENDSHIP_GAIN[result.score] ?? 0
    if (gain > 0 && customer.characterId) {
      setFriendshipGain(gain)
      setTimeout(() => setFriendshipGain(null), 1500)
      onFriendshipGain(customer.characterId, result.score)
    } else {
      setFriendshipGain(null)
    }

    // Apply state updates immediately (coins, rep, vocabulary)
    const ps = playerStateRef.current
    const isCorrect = result.score === 'PERFECT' || result.score === 'GOOD'
    const targetWordId = exchange.templateId // templateId stores the target word id
    const updatedState = updateMastery(
      ps, targetWordId, isCorrect
    )

    // Update wrong queue
    const MAX_WRONG_QUEUE = 10
    const REDEMPTION_THRESHOLD = 5
    let wrongQueue = [...(ps.wrongQueue ?? [])]
    if (isCorrect) {
      const idx = wrongQueue.findIndex(e => e.wordId === targetWordId)
      if (idx !== -1) {
        wrongQueue[idx] = { ...wrongQueue[idx], streak: wrongQueue[idx].streak + 1 }
        if (wrongQueue[idx].streak >= REDEMPTION_THRESHOLD) {
          wrongQueue.splice(idx, 1)
        }
      }
    } else {
      const idx = wrongQueue.findIndex(e => e.wordId === targetWordId)
      if (idx !== -1) {
        wrongQueue[idx] = { wordId: targetWordId, streak: 0 }
      } else {
        wrongQueue.push({ wordId: targetWordId, streak: 0 })
        if (wrongQueue.length > MAX_WRONG_QUEUE) {
          wrongQueue = wrongQueue.slice(-MAX_WRONG_QUEUE)
        }
      }
    }

    // Compute rep change for this exchange
    let repChange = bonuses.repBonusPerCustomer
    if (result.score === 'PERFECT') repChange += 1
    if (result.score === 'MISSED') repChange -= 1

    // Coin penalty for wrong answers
    const coinPenalty = result.score === 'MISSED' ? 1 : 0

    // Track penalty for UI display
    if (result.score === 'MISSED') {
      setLastPenalty({ coins: coinPenalty, rep: 1 })
    } else {
      setLastPenalty(null)
    }

    // Accumulate net session earnings (tips minus penalties)
    if (sessionRef.current) {
      sessionRef.current.coinsEarned += result.tipAmount - coinPenalty
      setSessionProgress({
        served: sessionRef.current.actorsServed,
        coins: Math.round(sessionRef.current.coinsEarned),
      })
    }

    // Update quest progress
    let updatedQuests = ps.quests
    if (updatedQuests) {
      const questEvent: QuestEvent = {
        score: result.score,
        characterId: customer.characterId,
        hintLevel: hintLevelRef.current,
        coinsEarned: result.tipAmount,
        repEarned: Math.max(0, repChange),
      }
      updatedQuests = updateQuestProgress(updatedQuests, questEvent)
    }

    onStateUpdate({
      coins: Math.max(0, Math.round((updatedState.coins + result.tipAmount - coinPenalty) * 100) / 100),
      reputation: Math.max(0, Math.round(updatedState.reputation + repChange)),
      vocabulary: updatedState.vocabulary,
      totalCustomersServed: updatedState.totalCustomersServed + 1,
      wrongQueue,
      quests: updatedQuests,
    })

    // Correct: auto-advance after 1s. Wrong: wait for manual "Next" tap.
    if (isCorrect) {
      setTimeout(() => advanceConversation(state, customer), 1000)
    }
    // If wrong, advanceConversation is called by the "Next" button
  }, [bonuses, onFriendshipGain, onStateUpdate])

  function advanceConversation(state: WorldState, customer: import('../lib/types').CustomerState) {
    const roundsDone = state.activeConvo!.exchangeIndex + 1
    const roundsTarget = customer.roundsTarget ?? 1

    if (roundsDone < roundsTarget) {
      // Generate next exchange dynamically using latest state
      const ps = playerStateRef.current
      // Build recency from global buffer + words already used in this conversation
      const convoWordIds = customer.conversation.exchanges.map(e => e.templateId)
      const combinedRecency = [...ps.recencyBuffer, ...convoWordIds].slice(-10)
      const { exchange } = generateWordQuiz(
        expressions, ps.vocabulary, combinedRecency, ps.wrongQueue ?? [], quizMode
      )
      // Append to conversation and advance
      customer.conversation.exchanges.push(exchange)
      const nextIndex = roundsDone
      state.activeConvo!.exchangeIndex = nextIndex
      customer.nextExchangeIndex = nextIndex
      setActiveExchange(exchange)
      setLastResult(null)
      setSelectedChoiceId(null)
      setFriendshipGain(null)
      setHintLevel(0)
      hintLevelRef.current = 0
      setResponding(true)
      respondingRef.current = true
      processingRef.current = false
      setPatiencePercent(100)
    } else {
      endConversation(state)
      setActiveExchange(null)
      setLastResult(null)
      setSelectedChoiceId(null)
      setFriendshipGain(null)
      processingRef.current = false

      // Update conversation-end quest progress (serve_customers + serve_perfectly)
      const ps = playerStateRef.current
      if (ps.quests) {
        onStateUpdate({ quests: updateConversationEndProgress(ps.quests) })
      }

      // If that was this NPC's last request, they're served and leaving.
      markRequestComplete(customer)
    }
  }

  function handleDismissWrong() {
    const state = cafeStateRef.current
    if (!state || !state.activeConvo) return
    const customer = state.characters.find(c => c.id === state.activeConvo!.customerId)
    if (!customer) return
    advanceConversation(state, customer)
  }

  function handleChoiceTap(choice: AnswerChoice) {
    if (!responding || processingRef.current) return
    setSelectedChoiceId(choice.id)
    setResponding(false)
    respondingRef.current = false
    processingRef.current = true
    speakFrench(choice.displayText).then(() => {
      processingRef.current = false
      processResult(choice)
    })
  }

  function handleHint() {
    if (!responding) return
    setHintLevel(prev => {
      const next = Math.min(prev + 1, 2)
      hintLevelRef.current = next
      return next
    })
  }

  return (
    <>
      <HUD
        coins={playerState.coins}
        reputation={playerState.reputation}
        onQuestsTap={() => setShowQuests(true)}
        hasClaimableQuest={checkClaimableQuest(playerState.quests, playerState.coins, playerState.reputation)}
      />

      {activeLevel && (() => {
        const thresholds = activeLevel.starThresholds
        const maxThreshold = thresholds[thresholds.length - 1]
        const fillPct = Math.min(100, Math.max(0, (sessionProgress.coins / maxThreshold) * 100))
        const remaining = Math.max(0, activeLevel.actors.length - sessionProgress.served)
        return (
          <div style={styles.sessionBar}>
            <button style={styles.endDayButton} onClick={handleEndSession}>End Day</button>
            <div style={styles.sessionCoins}>
              <span style={{ fontSize: 13 }}>💰</span>
              <span style={styles.sessionCoinsValue}>{sessionProgress.coins}</span>
            </div>
            <div style={styles.sessionTrack}>
              <div style={{ ...styles.sessionFill, width: `${fillPct}%` }} />
              {thresholds.map((th, i) => {
                const earned = sessionProgress.coins >= th
                const leftPct = Math.min(100, (th / maxThreshold) * 100)
                return (
                  <span
                    key={i}
                    style={{
                      ...styles.sessionStar,
                      left: `${leftPct}%`,
                      color: earned ? '#FFD54F' : '#6D5750',
                      textShadow: earned
                        ? '0 0 4px rgba(255,213,79,0.9), 0 1px 2px rgba(0,0,0,0.8)'
                        : '0 1px 2px rgba(0,0,0,0.8)',
                    }}
                  >
                    ★
                  </span>
                )
              })}
            </div>
            <div style={styles.sessionLeftBox}>
              <span style={styles.sessionLeftNum}>{remaining}</span>
              <span style={{ fontSize: 13 }}>👤</span>
            </div>
          </div>
        )
      })()}

      <CafeCanvas
        cafeStateRef={cafeStateRef}
        onCustomerTap={handleCustomerTap}
        onCharacterTap={setInspectedCharacterId}
        onContactsTap={() => setShowContacts(true)}
        onUpgradesTap={() => setShowUpgradeShop(true)}
        onDictionaryTap={() => setShowDictionary(true)}
        onSettingsTap={() => setShowSettings(true)}
        onSceneChange={handleSceneChange}
        upgrades={playerState.upgrades}
        patioUnlocked={patioUnlocked}
        onPatioLockTap={() => setShowPatioPrompt(true)}
        placingItem={placingItem}
        placingSlots={placingSlots}
        onPlace={handleFurnishingPlace}
        onCancelPlace={() => setPlacingItem(null)}
        placedFurnishings={placedFurnishings}
        furnishingUpgrades={playerState.furnishingUpgrades}
        onFurnishingTap={(itemId) => { playTapSound(); setInspectedFurnishingId(itemId) }}
        hideBottomButtons={!!activeExchange}
        hasReadyUpgrades={readyToInstallIds.length > 0}
        lockInteraction={showContacts || showDictionary || showUpgradeShop || showQuests || showSettings || showPatioPrompt || showLevelSelect || !!sessionResult}
        onLevelsTap={() => setShowLevelSelect(true)}
        sessionActive={!!activeLevel}
      />

      {/* Upgrade install toasts removed — red badge on upgrade button instead */}

      {patioUnlockToast && (
        <div style={styles.toastContainer}>
          <div style={styles.toast}>
            <span style={{ flex: 1, fontWeight: 600 }}>Patio unlocked!</span>
          </div>
        </div>
      )}

      {/* Patio purchase prompt */}
      {showPatioPrompt && (
        <div style={styles.settingsOverlay} onClick={() => setShowPatioPrompt(false)}>
          <div style={styles.settingsCard} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 22, textAlign: 'center' as const, marginBottom: 4 }}>🌿</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#FFEFD5', textAlign: 'center' as const, marginBottom: 4 }}>
              Patio Terrace
            </div>
            <div style={{ fontSize: 12, color: '#BCAAA4', textAlign: 'center' as const, marginBottom: 12 }}>
              A cozy outdoor area with bistro seating
            </div>
            {playerState.reputation < PATIO_UNLOCK_REP ? (
              <div style={{ backgroundColor: '#3E2723', borderRadius: 8, padding: '8px 12px', textAlign: 'center' as const, fontSize: 13, color: '#EF5350', fontWeight: 600 }}>
                Requires {PATIO_UNLOCK_REP} reputation (you have {Math.round(playerState.reputation)})
              </div>
            ) : (
              <button
                style={{
                  display: 'block', width: '100%', padding: '10px 0',
                  backgroundColor: '#FFD54F', color: '#3E2723', border: 'none',
                  borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  opacity: playerState.coins >= PATIO_UNLOCK_COST ? 1 : 0.4,
                }}
                disabled={playerState.coins < PATIO_UNLOCK_COST}
                onClick={() => { handlePatioUnlock(); setShowPatioPrompt(false) }}
              >
                Unlock — {PATIO_UNLOCK_COST} coins
              </button>
            )}
            <button style={{ ...styles.closeSettingsButton, marginTop: 8 }} onClick={() => setShowPatioPrompt(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {showContacts && (
        <ContactsView
          relationships={playerState.relationships ?? {}}
          reputation={playerState.reputation}
          onClose={() => setShowContacts(false)}
        />
      )}

      {showDictionary && (
        <DictionaryView
          expressions={expressions}
          vocabulary={playerState.vocabulary ?? {}}
          onClose={() => setShowDictionary(false)}
        />
      )}

      {showUpgradeShop && (
        <UpgradeShop
          playerState={playerState}
          onPurchase={onPurchase}
          onInstall={onInstall}
          onFinishUpgrade={onFinishUpgrade}
          onClose={() => setShowUpgradeShop(false)}
          patioUnlocked={patioUnlocked}
          onPatioUnlock={handlePatioUnlock}
          placedFurnishings={placedFurnishings}
          onFurnishingBuy={handleFurnishingBuy}
          furnishingUpgrades={playerState.furnishingUpgrades ?? {}}
          onFurnishingPurchase={onFurnishingPurchase}
          onFurnishingInstall={onFurnishingInstall}
          onFurnishingFinish={onFurnishingFinish}
        />
      )}

      {showQuests && (
        <QuestsView
          playerState={playerState}
          onStateUpdate={onStateUpdate}
          onClose={() => setShowQuests(false)}
        />
      )}

      {showSettings && (
        <div style={styles.settingsOverlay} onClick={() => setShowSettings(false)}>
          <div style={styles.settingsCard} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#FFEFD5', marginBottom: 12 }}>Settings</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ color: '#FFEFD5', fontSize: 13 }}>{musicVolume === 0 ? '🔇' : '🔊'}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={musicVolume}
                onChange={e => handleVolumeChange(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#FFD54F' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                style={styles.debugButton}
                onClick={() => {
                  const val = prompt('Set coins:', String(playerState.coins))
                  if (val !== null) onDebugSet('coins', Number(val) || 0)
                }}
              >
                Set Coins
              </button>
              <button
                style={styles.debugButton}
                onClick={() => {
                  const val = prompt('Set reputation:', String(playerState.reputation))
                  if (val !== null) onDebugSet('reputation', Number(val) || 0)
                }}
              >
                Set Rep
              </button>
            </div>
            <button
              style={styles.resetButton}
              onClick={() => { if (confirm('Reset all progress?')) { onReset(); setShowSettings(false) } }}
            >
              Reset Game
            </button>
            <button style={styles.closeSettingsButton} onClick={() => setShowSettings(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Furnishing inspection popup */}
      {inspectedFurnishingId && !activeExchange && (() => {
        const item = ALL_FURNISHINGS.find(f => f.id === inspectedFurnishingId)
        if (!item) return null
        const upgradeId = TILE_TO_UPGRADE_ID[item.tileId]
        const catalog = upgradeId ? getUpgradeCatalogEntry(upgradeId) : undefined
        const furnUpgrades = playerState.furnishingUpgrades ?? {}
        const level = furnUpgrades[inspectedFurnishingId]
        const currentTier = level?.tier ?? 0
        const maxTier = catalog?.tiers.length ?? 0
        const isMaxed = currentTier >= maxTier
        const hasUpgrading = !!level?.upgrading
        const timeRemaining = level ? getUpgradeTimeRemaining(level) : 0
        const isReady = hasUpgrading && timeRemaining === 0
        const isUpgrading = hasUpgrading && timeRemaining > 0
        const nextTier = catalog?.tiers.find(t => t.tier === currentTier + 1)
        const canAfford = nextTier ? playerState.coins >= nextTier.cost : false
        const hasRep = nextTier ? playerState.reputation >= nextTier.requiredReputation : false

        return (
          <div style={styles.charInfoOverlay} onClick={() => setInspectedFurnishingId(null)}>
            <div style={{ ...styles.settingsCard, maxWidth: 280 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#FFEFD5', marginBottom: 2 }}>{item.name}</div>
              <div style={{ fontSize: 11, color: '#BCAAA4', marginBottom: 8 }}>{item.description}</div>

              {/* Tier dots (base + upgrade tiers) */}
              {catalog && maxTier > 0 && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  {[0, ...catalog.tiers.map(t => t.tier)].map((tier) => (
                    <div key={tier} style={{
                      width: 8, height: 8, borderRadius: '50%',
                      backgroundColor: currentTier >= tier ? '#FFD54F' : '#5D4037',
                      border: '1px solid #8D6E63',
                    }} />
                  ))}
                </div>
              )}

              {/* Current tier info */}
              {currentTier > 0 && (() => {
                const curTierData = catalog?.tiers.find(t => t.tier === currentTier)
                return curTierData ? (
                  <div style={{ fontSize: 11, color: '#A5D6A7', marginBottom: 6 }}>
                    {curTierData.name} — {curTierData.bonusDescription}
                  </div>
                ) : null
              })()}

              {/* Upgrading in progress */}
              {isUpgrading && !isReady && (
                <div style={{ backgroundColor: '#5D4037', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: '#FFD54F', fontWeight: 600, marginBottom: 4 }}>
                    Upgrading to {nextTier?.name ?? `Tier ${currentTier + 1}`}...
                  </div>
                  <div style={{ height: 6, backgroundColor: '#3E2723', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{
                      height: '100%', borderRadius: 3, backgroundColor: '#FFD54F',
                      width: `${level?.upgrading ? Math.max(0, 100 - (timeRemaining / level.upgrading.durationMs) * 100) : 0}%`,
                      transition: 'width 1s linear',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#BCAAA4', textAlign: 'center' as const }}>
                    {formatTimeRemaining(timeRemaining)}
                  </div>
                </div>
              )}

              {/* Ready to install */}
              {isReady && (
                <button
                  style={{
                    display: 'block', width: '100%', padding: '10px 0', marginBottom: 6,
                    backgroundColor: '#4CAF50', color: '#fff', border: 'none',
                    borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                  onClick={() => { playInstallSound(); onFurnishingInstall(inspectedFurnishingId); setInspectedFurnishingId(null) }}
                >
                  Install Upgrade
                </button>
              )}

              {/* Upgrade button */}
              {!isUpgrading && !isReady && !isMaxed && nextTier && (
                <button
                  style={{
                    display: 'block', width: '100%', padding: '10px 0', marginBottom: 6,
                    backgroundColor: canAfford && hasRep ? '#FFD54F' : '#5D4037',
                    color: canAfford && hasRep ? '#3E2723' : '#8D6E63',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    opacity: canAfford && hasRep ? 1 : 0.6,
                  }}
                  disabled={!canAfford || !hasRep}
                  onClick={() => {
                    playUpgradeStartSound()
                    onFurnishingPurchase(inspectedFurnishingId, nextTier.tier, nextTier.cost, nextTier.durationMs)
                    setInspectedFurnishingId(null)
                  }}
                >
                  <div>{nextTier.name}</div>
                  <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>
                    {nextTier.bonusDescription} — {nextTier.cost} coins
                  </div>
                </button>
              )}

              {!hasRep && nextTier && !isUpgrading && !isReady && (
                <div style={{ fontSize: 10, color: '#EF5350', textAlign: 'center' as const, marginBottom: 4 }}>
                  Requires {nextTier.requiredReputation} reputation
                </div>
              )}

              {isMaxed && !isUpgrading && (
                <div style={{ fontSize: 12, color: '#FFD54F', fontWeight: 600, textAlign: 'center' as const, marginBottom: 6 }}>
                  Fully upgraded!
                </div>
              )}

              {!catalog && (
                <div style={{ fontSize: 11, color: '#8D6E63', textAlign: 'center' as const, marginBottom: 6 }}>
                  This item cannot be upgraded
                </div>
              )}

              <button style={styles.closeSettingsButton} onClick={() => setInspectedFurnishingId(null)}>
                Close
              </button>
            </div>
          </div>
        )
      })()}

      {/* Character info popup */}
      {inspectedCharacterId && !activeExchange && (() => {
        const char = getCharacter(inspectedCharacterId)
        if (!char) return null
        const rel = playerState.relationships?.[inspectedCharacterId]
        const friendship = rel?.friendship ?? 0
        const fl = getFriendshipLevel(friendship)
        return (
          <div style={styles.charInfoOverlay} onClick={() => setInspectedCharacterId(null)}>
            <div style={styles.charInfoCard} onClick={e => e.stopPropagation()}>
              <img
                src={spriteToDataURL(char.spriteVariant, 64)}
                width={64}
                height={64}
                alt={char.name}
                style={{ imageRendering: 'pixelated' }}
              />
              <div style={styles.charInfoDetails}>
                <div style={styles.charInfoName}>{char.name}</div>
                <div style={styles.charInfoBio}>{char.bio}</div>
                <div style={styles.charInfoFriendship}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                    <span style={{ color: '#FFD54F' }}>{fl.current.title}</span>
                    {fl.next && <span style={{ color: '#8D6E63' }}>{fl.next.title}</span>}
                  </div>
                  <div style={styles.charInfoBarBg}>
                    <div style={{ ...styles.charInfoBarFill, width: `${fl.progress * 100}%` }} />
                  </div>
                  {rel && (
                    <div style={{ fontSize: 10, color: '#8D6E63', marginTop: 2 }}>
                      Served {rel.timesServed} time{rel.timesServed !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
              <button style={styles.charInfoClose} onClick={() => setInspectedCharacterId(null)}>✕</button>
            </div>
          </div>
        )
      })()}

      {/* Conversation overlay */}
      {activeExchange && (
        <>
          <button style={styles.abortButton} onClick={() => {
            const state = cafeStateRef.current
            // Penalize current word as MISSED if not already answered
            if (!selectedChoiceId && activeExchange) {
              const targetWordId = activeExchange.templateId
              const ps = playerStateRef.current
              const updatedState = updateMastery(ps, targetWordId, false)
              // Update wrong queue
              const MAX_WRONG_QUEUE = 10
              let wq = [...(ps.wrongQueue ?? [])]
              const idx = wq.findIndex(e => e.wordId === targetWordId)
              if (idx !== -1) {
                wq[idx] = { wordId: targetWordId, streak: 0 }
              } else {
                wq.push({ wordId: targetWordId, streak: 0 })
                if (wq.length > MAX_WRONG_QUEUE) wq = wq.slice(-MAX_WRONG_QUEUE)
              }
              onStateUpdate({
                vocabulary: updatedState.vocabulary,
                wrongQueue: wq,
              })
            }
            const customer = state?.activeConvo
              ? state.characters.find(c => c.id === state.activeConvo!.customerId)
              : undefined
            if (state) {
              endConversation(state)
            }
            // Abandoning the request still completes it for session tracking.
            if (customer) markRequestComplete(customer)
            setActiveExchange(null)
            setLastResult(null)
            setSelectedChoiceId(null)
            setResponding(false)
            respondingRef.current = false
            processingRef.current = false
          }}>✕ Leave</button>
          <div style={styles.speechOverlay}>
            {lastResult && (
              <div style={styles.scoreContainer}>
                <div style={{ ...styles.scoreText, color: SCORE_COLORS[lastResult.score] }}>
                  {lastResult.score}
                </div>
                {lastResult.tipAmount > 0 && (
                  <div style={styles.tipText}>+{lastResult.tipAmount} coins</div>
                )}
                {lastPenalty && (
                  <div style={styles.penaltyText}>
                    −{lastPenalty.coins} coin · −{lastPenalty.rep} rep
                  </div>
                )}
                {lastResult.score === 'MISSED' && (
                  <button style={styles.nextButton} onClick={handleDismissWrong}>
                    Next
                  </button>
                )}
              </div>
            )}

            <div style={styles.speechRow}>
              {!selectedChoiceId ? (
                <button style={styles.iDontKnowButton} onClick={() => {
                  if (!responding || processingRef.current) return
                  setSelectedChoiceId('skip')
                  processResult(null)
                }}>✕</button>
              ) : (
                <div style={{ width: 32, flexShrink: 0 }} />
              )}
              <div style={styles.speechBubble}>
                <div style={styles.patienceContainerInline}>
                  <div style={{
                    ...styles.patienceBar,
                    width: `${patiencePercent}%`,
                    background: '#4CAF50',
                    transition: patiencePercent === 0
                      ? `width ${patienceDuration}ms linear, background ${patienceDuration}ms linear`
                      : 'none',
                  }} />
                </div>
                <div style={styles.portraitRow}>
                  <img
                    src={faceToDataURL(
                      activeSpriteVariant,
                      lastResult
                        ? lastResult.score === 'PERFECT' || lastResult.score === 'GOOD' ? 'happy'
                        : lastResult.score === 'MISSED' ? 'sad'
                        : 'surprised'
                        : 'neutral',
                      48,
                    )}
                    width={48}
                    height={48}
                    alt=""
                    style={styles.portraitImg}
                  />
                  <div style={styles.portraitInfo}>
                    {activeCharacterName && (
                      <div style={styles.characterName}>{activeCharacterName}</div>
                    )}
                    {friendshipGain !== null && (
                      <span style={styles.friendshipGain}>+{friendshipGain} ♥</span>
                    )}
                  </div>
                </div>
                <div style={styles.speechText}>{renderCustomerLine(activeExchange.customerLine)}</div>
                {hintLevel >= 1 && <div style={styles.hintText}>{activeExchange.hintIdea}</div>}
                {hintLevel >= 2 && <div style={styles.hintTranslation}>{activeExchange.hintTranslation}</div>}
              </div>
              <button style={styles.hintButton} onClick={handleHint}>?</button>
            </div>
          </div>
        </>
      )}

      {/* Choice buttons */}
      {activeExchange && (
        <div className="response-area">
          <div className="choices-grid">
            {activeExchange.choices.map((choice) => {
              const isSelected = selectedChoiceId === choice.id
              const showResult = selectedChoiceId !== null
              let resultClass = ''
              if (showResult && isSelected) {
                resultClass = choice.score === 'PERFECT' || choice.score === 'GOOD'
                  ? 'choice-correct' : 'choice-wrong'
              }
              const isBest = showResult && !isSelected &&
                (choice.score === 'PERFECT' || choice.score === 'GOOD')
              const isCorrectAnswer = choice.score === 'PERFECT' || choice.score === 'GOOD'
              return (
                <button
                  key={choice.id}
                  className={`choice-button ${isSelected ? 'selected' : ''} ${resultClass} ${isBest ? 'choice-hint' : ''} ${showResult && !isSelected && !isBest ? 'faded' : ''}`}
                  style={showResult && isCorrectAnswer ? { position: 'relative' as const } : undefined}
                  onClick={() => {
                    if (showResult && isCorrectAnswer) {
                      speakFrench(choice.displayText)
                    } else {
                      handleChoiceTap(choice)
                    }
                  }}
                  disabled={showResult && !isCorrectAnswer}
                >
                  {choice.displayText}
                  {showResult && isCorrectAnswer && (
                    <span
                      style={styles.infoIcon}
                      onClick={(e) => {
                        e.stopPropagation()
                        const expr = expressions.find(ex => ex.id === activeExchange?.templateId)
                        if (expr) setWordDetailExpr(expr)
                      }}
                    >
                      i
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Word detail popup */}
      {wordDetailExpr && (
        <div style={styles.wordDetailOverlay} onClick={() => setWordDetailExpr(null)}>
          <div style={styles.wordDetailPanel} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={styles.wordDetailTitle}>{wordDetailExpr.text}</div>
                <button style={styles.wordDetailAudio} onClick={() => speakFrench(wordDetailExpr.text)}>🔊</button>
              </div>
              <button style={styles.wordDetailClose} onClick={() => setWordDetailExpr(null)}>✕</button>
            </div>
            <div style={styles.wordDetailNative}>{wordDetailExpr.nativeText}</div>
            {wordDetailExpr.definition && (
              <div style={styles.wordDetailDef}>{wordDetailExpr.definition}</div>
            )}
            {wordDetailExpr.examples && wordDetailExpr.examples.length > 0 && (
              <div style={styles.wordDetailExamples}>
                {wordDetailExpr.examples.map((ex, i) => (
                  <div key={i} style={styles.wordDetailExample}>
                    {ex.split(/(\{[^}]+\})/).map((part, j) =>
                      part.startsWith('{') && part.endsWith('}')
                        ? <span key={j} style={{ color: '#FFD54F', fontWeight: 700 }}>{part.slice(1, -1)}</span>
                        : <span key={j}>{part}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Level select */}
      {showLevelSelect && (
        <LevelSelectView
          levelProgress={playerState.levelProgress ?? {}}
          onStartLevel={startSession}
          onClose={() => setShowLevelSelect(false)}
        />
      )}

      {/* End-of-session summary */}
      {sessionResult && (
        <SessionSummary
          result={sessionResult}
          onReplay={() => startSession(sessionResult.level)}
          onNextLevel={() => sessionResult.nextLevel && startSession(sessionResult.nextLevel)}
          onBackToCafe={() => setSessionResult(null)}
        />
      )}
    </>
  )
}

const SCORE_COLORS: Record<Score, string> = {
  PERFECT: '#FFD700',
  GOOD: '#4CAF50',
  UNDERSTOOD: '#9E9E9E',
  MISSED: '#F44336',
}

const styles: Record<string, React.CSSProperties> = {
  sessionBar: {
    position: 'absolute',
    top: 'calc(env(safe-area-inset-top) + 52px)',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 8px',
    width: 'auto',
    maxWidth: 'calc(100% - 24px)',
    boxSizing: 'border-box' as const,
    background: 'rgba(62, 39, 35, 0.94)',
    border: '1px solid #6D4C41',
    borderRadius: 16,
    zIndex: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  },
  endDayButton: {
    flexShrink: 0,
    background: 'rgba(120, 50, 45, 0.95)',
    color: '#FFCDD2',
    border: '1px solid #A1554E',
    borderRadius: 12,
    padding: '5px 10px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  sessionCoins: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  sessionCoinsValue: {
    color: '#FFD54F',
    fontSize: 13,
    fontWeight: 800,
    fontFamily: 'monospace',
    minWidth: 22,
  },
  sessionTrack: {
    position: 'relative' as const,
    flexShrink: 0,
    width: 110,
    height: 12,
    background: '#2C1A12',
    borderRadius: 6,
    border: '1px solid #5D4037',
    overflow: 'visible' as const,
  },
  sessionFill: {
    height: '100%',
    borderRadius: 6,
    background: 'linear-gradient(90deg, #42A5F5 0%, #64B5F6 100%)',
    transition: 'width 0.4s ease',
  },
  sessionStar: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: 18,
    lineHeight: 1,
    pointerEvents: 'none' as const,
  },
  sessionLeftBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
    color: '#FFEFD5',
  },
  sessionLeftNum: {
    fontSize: 13,
    fontWeight: 800,
    fontFamily: 'monospace',
  },
  toastContainer: {
    position: 'absolute',
    top: 40,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    zIndex: 20,
    width: '80%',
    maxWidth: 320,
  },
  toast: {
    backgroundColor: '#FFD54F',
    color: '#3E2723',
    padding: '8px 12px',
    borderRadius: 10,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  toastButton: {
    backgroundColor: '#3E2723',
    color: '#FFD54F',
    border: 'none',
    borderRadius: 6,
    padding: '4px 12px',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
  },
  settingsOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  settingsCard: {
    backgroundColor: '#3E2723',
    borderRadius: 14,
    padding: 20,
    border: '2px solid #5D4037',
    boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
    width: '80%',
    maxWidth: 300,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  debugButton: {
    flex: 1,
    backgroundColor: '#5D4037',
    color: '#FFEFD5',
    border: '1px solid #8D6E63',
    borderRadius: 8,
    padding: '8px 0',
    fontSize: 12,
    cursor: 'pointer',
  },
  resetButton: {
    backgroundColor: 'transparent',
    color: '#F44336',
    border: '1px solid #F44336',
    borderRadius: 8,
    padding: '8px 0',
    fontSize: 12,
    cursor: 'pointer',
    marginBottom: 4,
  },
  closeSettingsButton: {
    backgroundColor: '#5D4037',
    color: '#FFEFD5',
    border: 'none',
    borderRadius: 8,
    padding: '8px 0',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  speechOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 10,
  },
  speechRow: {
    position: 'absolute',
    bottom: '28%',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'auto',
  },
  speechBubble: {
    background: '#FFFEF7',
    borderRadius: 12,
    padding: '10px 16px',
    minWidth: 240,
    maxWidth: 360,
    boxShadow: '0 3px 12px rgba(0,0,0,0.25)',
    textAlign: 'left' as const,
    border: '2px solid #5D4037',
  },
  portraitRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  portraitImg: {
    imageRendering: 'pixelated' as const,
    borderRadius: 6,
    border: '2px solid #5D4037',
    background: '#F5EDE3',
    flexShrink: 0,
  },
  portraitInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: 2,
  },
  characterName: {
    fontSize: 11,
    fontWeight: 700,
    color: '#8D6E63',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  friendshipGain: {
    fontSize: 11,
    fontWeight: 700,
    color: '#E91E63',
    marginBottom: 2,
    animation: 'fadeInUp 0.3s ease-out',
  },
  speechText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#2C1810',
    lineHeight: 1.4,
  },
  hintText: {
    marginTop: 6,
    fontSize: 12,
    color: '#8B6F47',
    fontStyle: 'italic',
    borderTop: '1px solid rgba(139,111,71,0.2)',
    paddingTop: 4,
  },
  hintTranslation: {
    marginTop: 2,
    fontSize: 12,
    color: '#A0845C',
    fontStyle: 'italic',
  },
  patienceContainerInline: {
    width: '100%',
    marginBottom: 6,
    height: 6,
    background: 'rgba(0,0,0,0.4)',
    borderRadius: 3,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  patienceBar: {
    height: '100%',
    borderRadius: 3,
  },
  hintButton: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.5)',
    background: 'rgba(93,64,55,0.85)',
    color: '#FFEFD5',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
  },
  iDontKnowButton: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '2px solid rgba(244,67,54,0.5)',
    background: 'rgba(93,64,55,0.85)',
    color: '#F44336',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
  },
  scoreContainer: {
    position: 'absolute',
    bottom: '50%',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    pointerEvents: 'auto',
  },
  scoreText: {
    fontSize: 28,
    fontWeight: 800,
    textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.3)',
    textTransform: 'uppercase',
    animation: 'scorePop 0.35s ease-out',
  },
  tipText: {
    fontSize: 22,
    fontWeight: 700,
    color: '#FFD700',
    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
  },
  penaltyText: {
    fontSize: 20,
    fontWeight: 700,
    color: '#F44336',
    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
  },
  correctAnswer: {
    fontSize: 18,
    textAlign: 'center' as const,
    marginTop: 6,
    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
  },
  nextButton: {
    marginTop: 10,
    padding: '8px 24px',
    background: 'rgba(93, 64, 55, 0.9)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    color: '#FFEFD5',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  abortButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: '4px 12px',
    background: 'rgba(93, 64, 55, 0.85)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    color: '#FFEFD5',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    zIndex: 15,
    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
  },
  charInfoOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  charInfoCard: {
    backgroundColor: '#3E2723',
    borderRadius: 14,
    padding: 14,
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    border: '2px solid #5D4037',
    boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
    maxWidth: 320,
    width: '85%',
    position: 'relative' as const,
  },
  charInfoDetails: {
    flex: 1,
    minWidth: 0,
  },
  charInfoName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#FFEFD5',
  },
  charInfoBio: {
    fontSize: 12,
    color: '#BCAAA4',
    marginTop: 2,
  },
  charInfoFriendship: {
    marginTop: 8,
  },
  charInfoBarBg: {
    height: 6,
    backgroundColor: '#5D4037',
    borderRadius: 3,
    overflow: 'hidden',
  },
  charInfoBarFill: {
    height: '100%',
    backgroundColor: '#FFD54F',
    borderRadius: 3,
    transition: 'width 0.3s',
  },
  charInfoClose: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    background: 'none',
    border: 'none',
    color: '#8D6E63',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    padding: '2px 6px',
  },
  infoIcon: {
    position: 'absolute' as const,
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 24,
    height: 24,
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    border: '1.5px solid rgba(255,255,255,0.6)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    fontStyle: 'italic' as const,
    fontFamily: 'Georgia, serif',
    cursor: 'pointer',
  },
  wordDetailOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  wordDetailPanel: {
    backgroundColor: '#3E2723',
    borderRadius: 14,
    padding: 16,
    border: '2px solid #5D4037',
    boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
    maxWidth: 320,
    width: '85%',
  },
  wordDetailTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#FFEFD5',
  },
  wordDetailAudio: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  wordDetailClose: {
    background: 'none',
    border: 'none',
    color: '#8D6E63',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    padding: '2px 6px',
  },
  wordDetailNative: {
    fontSize: 14,
    color: '#BCAAA4',
    marginTop: 2,
  },
  wordDetailDef: {
    fontSize: 13,
    color: '#FFEFD5',
    lineHeight: 1.5,
    marginTop: 10,
    padding: '8px 10px',
    backgroundColor: '#4E342E',
    borderRadius: 8,
  },
  wordDetailExamples: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    marginTop: 10,
  },
  wordDetailExample: {
    fontSize: 13,
    color: '#BCAAA4',
    lineHeight: 1.5,
    paddingLeft: 10,
    borderLeft: '2px solid #6D4C41',
  },
}
