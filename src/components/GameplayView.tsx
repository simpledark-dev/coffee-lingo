'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  AnswerChoice, ResolvedExchange, Score,
  EvaluationResult, PlayerState, WorldState,
  DialogueTemplate, Expression, FurnishingItem, GridPos,
} from '../lib/types'
import { evaluateChoice, generateSingleConversation } from '../lib/game'
import { updateMastery } from '../lib/state'
import type { UpgradeBonuses } from '../lib/upgrades'
import { TILE_TO_UPGRADE_ID, getUpgradeCatalogEntry, getUpgradeTimeRemaining, formatTimeRemaining } from '../lib/upgrades'
import { createWorldState, tickWorld, startConversation, endConversation, spawnCharacter } from '../lib/cafe-sim'
import { PATIO_UNLOCK_REP, PATIO_UNLOCK_COST } from '../lib/tilemap'
import { buildPlacedTileMap, buildFurnishingPOIs, getAvailableSlots, ALL_FURNISHINGS } from '../lib/furnishing'
import { getCharacter, getFriendshipLevel, FRIENDSHIP_GAIN, pickNextCharacter, VoiceProfile } from '../lib/characters'
import { CUSTOMER_SPRITES, PALETTE } from '../lib/sprites'
import HUD from './HUD'
import CafeCanvas from './CafeCanvas'
import ContactsView from './ContactsView'
import UpgradeShop from './UpgradeShop'

interface GameplayViewProps {
  templates: DialogueTemplate[]
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

let _audioCtx: AudioContext | null = null
function playCoinSound() {
  if (typeof window === 'undefined') return
  if (!_audioCtx) _audioCtx = new AudioContext()
  const ctx = _audioCtx
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

// Cache French voices (male + female)
let cachedMaleVoice: SpeechSynthesisVoice | null = null
let cachedFemaleVoice: SpeechSynthesisVoice | null = null
let voicesLoaded = false

function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return
  voicesLoaded = true
  const frenchVoices = voices.filter(v => v.lang.startsWith('fr'))
  cachedMaleVoice =
    frenchVoices.find(v => /thomas|male|homme/i.test(v.name)) ??
    frenchVoices.find(v => !/female|femme|amélie|audrey|marie|sophie|julie/i.test(v.name)) ??
    frenchVoices[0] ??
    null
  cachedFemaleVoice =
    frenchVoices.find(v => /amélie|audrey|marie|female|femme|sophie|julie/i.test(v.name)) ??
    frenchVoices.find(v => v !== cachedMaleVoice) ??
    frenchVoices[0] ??
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
    utterance.lang = 'fr-FR'
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

export default function GameplayView({
  templates,
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
  const recentCharacterIdsRef = useRef<string[]>([])
  const playerStateRef = useRef(playerState)
  playerStateRef.current = playerState

  // React state for UI updates
  const [activeExchange, setActiveExchange] = useState<ResolvedExchange | null>(null)
  const [responding, setResponding] = useState(false)
  const [lastResult, setLastResult] = useState<EvaluationResult | null>(null)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [hintLevel, setHintLevel] = useState(0)
  const [patiencePercent, setPatiencePercent] = useState(100)
  const [activeCharacterName, setActiveCharacterName] = useState<string | null>(null)
  const activeGenderRef = useRef<'male' | 'female'>('male')
  const activeVoiceRef = useRef<VoiceProfile | undefined>(undefined)
  const [friendshipGain, setFriendshipGain] = useState<number | null>(null)
  const [inspectedCharacterId, setInspectedCharacterId] = useState<string | null>(null)
  const [showContacts, setShowContacts] = useState(false)
  const [showUpgradeShop, setShowUpgradeShop] = useState(false)
  const [showPatioPrompt, setShowPatioPrompt] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [sessionServed, setSessionServed] = useState(0)
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
  const patienceStartRef = useRef(0)
  const patienceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const patioUnlocked = playerState.unlockedRooms?.includes('patio') ?? false
  const [patioUnlockToast, setPatioUnlockToast] = useState(false)
  const [placingItem, setPlacingItem] = useState<FurnishingItem | null>(null)
  const [inspectedFurnishingId, setInspectedFurnishingId] = useState<string | null>(null)
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

  // Initialize simulation once on mount
  useEffect(() => {
    const state = createWorldState(bonuses.maxInShopBonus, patioUnlocked, tileOverrides, patioPOIs)
    cafeStateRef.current = state
    lastFrameRef.current = performance.now()

    // Initialize audio
    const audio = new Audio('/coffee_track.mp3')
    audio.loop = true
    audio.volume = musicVolume
    audioRef.current = audio

    // Autoplay is blocked by browsers until first user interaction
    function startAudio() {
      if (audio.volume > 0) audio.play().catch(() => {})
      document.removeEventListener('pointerdown', startAudio)
    }
    document.addEventListener('pointerdown', startAudio)

    return () => { audio.pause(); audio.src = ''; document.removeEventListener('pointerdown', startAudio) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSceneChange = useCallback((scene: 'interior' | 'outside') => {
    const audio = audioRef.current
    if (!audio || musicVolume === 0) return
    if (scene === 'interior') {
      audio.play().catch(() => {})
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
      if (vol === 0) { audio.pause() } else { audio.play().catch(() => {}) }
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

      if (result.shouldSpawn) {
        const ps = playerStateRef.current
        // Collect characters currently in the world to avoid duplicates
        const presentCharIds = state.characters.map(c => c.characterId)
        const characterId = pickNextCharacter(
          ps.reputation,
          ps.relationships ?? {},
          ps.totalCustomersServed,
          recentCharacterIdsRef.current,
          presentCharIds
        )
        // Empty string means all unlocked characters are already in the world
        if (!characterId) { requestAnimationFrame(loop); return }
        const { conversation, usedTemplateIds } = generateSingleConversation(
          templates, expressions, ps.vocabulary, ps.recencyBuffer
        )
        spawnCharacter(state, conversation, characterId)

        // Update recency buffers
        recentCharacterIdsRef.current = [...recentCharacterIdsRef.current, characterId].slice(-5)
        // Update template recency in state
        const newRecency = [...ps.recencyBuffer, ...usedTemplateIds].slice(-6)
        if (newRecency.join() !== ps.recencyBuffer.join()) {
          onStateUpdate({ recencyBuffer: newRecency })
        }
      }

      requestAnimationFrame(loop)
    }

    requestAnimationFrame(loop)
    return () => { running = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Patience timer for active conversation
  useEffect(() => {
    if (!activeExchange || !responding) {
      if (patienceTimerRef.current) clearInterval(patienceTimerRef.current)
      return
    }

    patienceStartRef.current = Date.now()
    setPatiencePercent(100)

    patienceTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - patienceStartRef.current
      const remaining = Math.max(0, 100 - (elapsed / (PATIENCE_DURATION + bonuses.patienceBonus)) * 100)
      setPatiencePercent(remaining)

      if (remaining <= 0) {
        if (patienceTimerRef.current) clearInterval(patienceTimerRef.current)
        if (respondingRef.current && !processingRef.current) {
          processResult(null)
        }
      }
    }, 100)

    return () => {
      if (patienceTimerRef.current) clearInterval(patienceTimerRef.current)
    }
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
    speakFrench(exchange.customerLine, activeGenderRef.current, activeVoiceRef.current)
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

    if (result.score === 'PERFECT' || result.score === 'GOOD') playCoinSound()

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
    const words = choice?.expressions ?? []
    const updatedState = updateMastery(
      ps, words,
      exchange.requiredIdeas, exchange.bonusIdeas,
      bonuses.masteryXpMultiplier
    )

    // Compute rep change for this exchange
    let repChange = bonuses.repBonusPerCustomer
    if (result.score === 'PERFECT') repChange += 1
    if (result.score === 'MISSED') repChange -= 1

    onStateUpdate({
      coins: Math.round((updatedState.coins + result.tipAmount) * 100) / 100,
      reputation: Math.max(0, Math.round(updatedState.reputation + repChange)),
      vocabulary: updatedState.vocabulary,
      totalCustomersServed: updatedState.totalCustomersServed + 1,
    })

    setSessionServed(prev => prev + 1)

    // Show score briefly, then advance to next exchange or end conversation
    setTimeout(() => {
      const nextIndex = state.activeConvo!.exchangeIndex + 1
      const nextExchange = customer.conversation.exchanges[nextIndex]

      if (nextExchange) {
        state.activeConvo!.exchangeIndex = nextIndex
        customer.nextExchangeIndex = nextIndex
        setActiveExchange(nextExchange)
        setLastResult(null)
        setSelectedChoiceId(null)
        setHintLevel(0)
        hintLevelRef.current = 0
        setResponding(true)
        respondingRef.current = true
        processingRef.current = false
        setPatiencePercent(100)
        speakFrench(nextExchange.customerLine, activeGenderRef.current, activeVoiceRef.current)
      } else {
        endConversation(state)
        setActiveExchange(null)
        setLastResult(null)
        setSelectedChoiceId(null)
        processingRef.current = false
      }
    }, 1000)
  }, [bonuses, onFriendshipGain, onStateUpdate])

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
        customersServed={sessionServed}
      />

      <CafeCanvas
        cafeStateRef={cafeStateRef}
        onCustomerTap={handleCustomerTap}
        onCharacterTap={setInspectedCharacterId}
        onContactsTap={() => setShowContacts(true)}
        onUpgradesTap={() => setShowUpgradeShop(true)}
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
        onFurnishingTap={(itemId) => setInspectedFurnishingId(itemId)}
      />

      {/* Upgrade install toasts */}
      {readyToInstallIds.length > 0 && (
        <div style={styles.toastContainer}>
          {readyToInstallIds.map((id) => (
            <div key={id} style={styles.toast}>
              <span style={{ flex: 1, fontWeight: 600 }}>Upgrade ready!</span>
              <button style={styles.toastButton} onClick={() => onInstall(id)}>Install</button>
            </div>
          ))}
        </div>
      )}

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
                  onClick={() => { onFurnishingInstall(inspectedFurnishingId); setInspectedFurnishingId(null) }}
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
          <div style={styles.speechOverlay}>
            <div style={styles.speechBubble}>
              {activeCharacterName && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <div style={styles.characterName}>{activeCharacterName}</div>
                  {friendshipGain !== null && (
                    <span style={styles.friendshipGain}>+{friendshipGain} ♥</span>
                  )}
                </div>
              )}
              <div style={styles.speechText}>{activeExchange.customerLine}</div>
              {hintLevel >= 1 && <div style={styles.hintText}>{activeExchange.hintIdea}</div>}
              {hintLevel >= 2 && <div style={styles.hintTranslation}>{activeExchange.hintTranslation}</div>}
            </div>

            <div style={styles.patienceContainer}>
              <div style={{
                ...styles.patienceBar,
                width: `${patiencePercent}%`,
                background: patiencePercent > 40 ? '#4CAF50' : patiencePercent > 15 ? '#FF9800' : '#F44336',
              }} />
            </div>

            <button style={styles.hintButton} onClick={handleHint}>?</button>

            {lastResult && (
              <div style={styles.scoreContainer}>
                <div style={{ ...styles.scoreText, color: SCORE_COLORS[lastResult.score] }}>
                  {lastResult.score}
                </div>
                {lastResult.tipAmount > 0 && (
                  <div style={styles.tipText}>+{lastResult.tipAmount} coins</div>
                )}
              </div>
            )}
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
              return (
                <button
                  key={choice.id}
                  className={`choice-button ${isSelected ? 'selected' : ''} ${resultClass} ${isBest ? 'choice-hint' : ''} ${showResult && !isSelected && !isBest ? 'faded' : ''}`}
                  onClick={() => handleChoiceTap(choice)}
                  disabled={showResult}
                >
                  {choice.displayText}
                </button>
              )
            })}
          </div>
        </div>
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
  speechBubble: {
    position: 'absolute',
    top: '15%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#FFFEF7',
    borderRadius: 12,
    padding: '10px 16px',
    minWidth: 160,
    maxWidth: 280,
    boxShadow: '0 3px 12px rgba(0,0,0,0.25)',
    textAlign: 'center',
    pointerEvents: 'auto',
    border: '2px solid #5D4037',
  },
  characterName: {
    fontSize: 11,
    fontWeight: 700,
    color: '#8D6E63',
    marginBottom: 2,
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
  patienceContainer: {
    position: 'absolute',
    top: '12%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 100,
    height: 6,
    background: 'rgba(0,0,0,0.4)',
    borderRadius: 3,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  patienceBar: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.5s linear, background 0.3s',
  },
  hintButton: {
    position: 'absolute',
    top: '16%',
    right: '8%',
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
  scoreContainer: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: 800,
    textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.3)',
    textTransform: 'uppercase',
  },
  tipText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#FFD700',
    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
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
}
