'use client'

import type { Level } from '../lib/levels'

export interface SessionResult {
  level: Level
  coins: number          // net coins earned this session
  stars: number          // 0-3 this session
  newlyUnlocked: Level | null
  nextLevel: Level | null
  nextUnlocked: boolean
  bestCoins: number      // all-time best net coins for this level
  bestStars: number      // all-time best stars for this level
}

interface SessionSummaryProps {
  result: SessionResult
  onReplay: () => void
  onNextLevel: () => void
  onBackToCafe: () => void
}

export default function SessionSummary({ result, onReplay, onNextLevel, onBackToCafe }: SessionSummaryProps) {
  const { level, coins, stars, newlyUnlocked, nextLevel, nextUnlocked, bestCoins, bestStars } = result
  const accomplished = stars >= 1
  const isNewBest = coins >= bestCoins && stars >= bestStars

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.title}>{accomplished ? 'Day Complete!' : 'Day Over'}</div>
        <div style={styles.subtitle}>Level {level.id} · {level.name}</div>

        <div style={styles.stars}>
          {[1, 2, 3].map(i => (
            <span
              key={i}
              style={{
                fontSize: 44,
                color: i <= stars ? '#FFD54F' : '#5D4037',
                animation: i <= stars ? `scorePop 0.4s ease-out ${i * 0.12}s both` : undefined,
              }}
            >
              {i <= stars ? '★' : '☆'}
            </span>
          ))}
        </div>

        <div style={styles.coinsRow}>
          <span style={styles.coinsIcon}>💰</span>
          <span style={styles.coinsValue}>+{coins}</span>
          <span style={styles.coinsLabel}>coins earned</span>
        </div>

        <div style={styles.thresholds}>
          ★ {level.starThresholds[0]} · ★★ {level.starThresholds[1]} · ★★★ {level.starThresholds[2]}
        </div>

        <div style={styles.bestRow}>
          {isNewBest ? (
            <span style={styles.newBest}>★ New best!</span>
          ) : (
            <>
              <span style={styles.bestLabel}>Best</span>
              <span style={styles.bestStars}>
                {[1, 2, 3].map(i => (
                  <span key={i} style={{ color: i <= bestStars ? '#FFD54F' : '#5D4037' }}>
                    {i <= bestStars ? '★' : '☆'}
                  </span>
                ))}
              </span>
              <span style={styles.bestCoins}>{bestCoins} 💰</span>
            </>
          )}
        </div>

        {!accomplished && (
          <div style={styles.failNote}>
            Earn {level.starThresholds[0]} coins to pass this level.
          </div>
        )}

        {newlyUnlocked && (
          <div style={styles.unlockNote}>🎉 Level {newlyUnlocked.id} unlocked!</div>
        )}

        <div style={styles.buttons}>
          {nextLevel && nextUnlocked && (
            <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={onNextLevel}>
              Next Level →
            </button>
          )}
          <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={onReplay}>
            Replay
          </button>
          <button style={{ ...styles.btn, ...styles.btnGhost }} onClick={onBackToCafe}>
            Back to Café
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 130,
    padding: 16,
  },
  card: {
    backgroundColor: '#3E2723',
    borderRadius: 16,
    padding: 24,
    border: '2px solid #5D4037',
    boxShadow: '0 6px 28px rgba(0,0,0,0.55)',
    width: '100%',
    maxWidth: 320,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: '#FFEFD5',
  },
  subtitle: {
    fontSize: 12,
    color: '#BCAAA4',
  },
  stars: {
    display: 'flex',
    gap: 8,
    margin: '8px 0',
  },
  coinsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  coinsIcon: {
    fontSize: 18,
  },
  coinsValue: {
    fontSize: 26,
    fontWeight: 800,
    color: '#FFD54F',
    fontFamily: 'monospace',
  },
  coinsLabel: {
    fontSize: 12,
    color: '#BCAAA4',
  },
  thresholds: {
    fontSize: 10,
    color: '#8D6E63',
    fontFamily: 'monospace',
  },
  bestRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    fontSize: 12,
  },
  bestLabel: {
    color: '#BCAAA4',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    fontSize: 10,
  },
  bestStars: {
    fontSize: 13,
    letterSpacing: 1,
  },
  bestCoins: {
    color: '#FFD54F',
    fontFamily: 'monospace',
    fontWeight: 700,
  },
  newBest: {
    color: '#A5D6A7',
    fontWeight: 800,
    fontSize: 13,
  },
  failNote: {
    fontSize: 12,
    color: '#EF9A9A',
    textAlign: 'center' as const,
    marginTop: 4,
  },
  unlockNote: {
    fontSize: 14,
    fontWeight: 700,
    color: '#A5D6A7',
    marginTop: 4,
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    width: '100%',
    marginTop: 12,
  },
  btn: {
    width: '100%',
    padding: '11px 0',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
  },
  btnPrimary: {
    backgroundColor: '#FFD54F',
    color: '#3E2723',
  },
  btnSecondary: {
    backgroundColor: '#5D4037',
    color: '#FFEFD5',
  },
  btnGhost: {
    backgroundColor: 'transparent',
    color: '#BCAAA4',
    border: '1px solid #5D4037',
  },
}
