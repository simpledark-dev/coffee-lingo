'use client'

import { LEVELS, isLevelUnlocked, type Level } from '../lib/levels'
import type { LevelProgress } from '../lib/types'

interface LevelSelectViewProps {
  levelProgress: Record<number, LevelProgress>
  onStartLevel: (level: Level) => void
  onClose: () => void
}

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3].map(i => (
        <span key={i} style={{ fontSize: 14, color: i <= count ? '#FFD54F' : '#5D4037' }}>
          {i <= count ? '★' : '☆'}
        </span>
      ))}
    </div>
  )
}

export default function LevelSelectView({ levelProgress, onStartLevel, onClose }: LevelSelectViewProps) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>Select a Day</span>
          <button style={styles.close} onClick={onClose}>✕</button>
        </div>

        <div style={styles.list}>
          {LEVELS.map(level => {
            const progress = levelProgress[level.id]
            const unlocked = isLevelUnlocked(level.id, levelProgress)
            return (
              <button
                key={level.id}
                style={{ ...styles.levelRow, opacity: unlocked ? 1 : 0.55, cursor: unlocked ? 'pointer' : 'default' }}
                disabled={!unlocked}
                onClick={() => unlocked && onStartLevel(level)}
              >
                <div style={styles.levelLeft}>
                  <div style={styles.levelName}>
                    {unlocked ? `Level ${level.id}` : '🔒 Locked'}
                  </div>
                  <div style={styles.levelSub}>
                    {unlocked ? level.name : `Earn 1★ on Level ${level.id - 1}`}
                  </div>
                </div>
                <div style={styles.levelRight}>
                  <Stars count={progress?.stars ?? 0} />
                  {unlocked && (
                    <div style={styles.levelGoal}>
                      {level.actors.length} guests · ★{level.starThresholds[0]} / ★★{level.starThresholds[1]} / ★★★{level.starThresholds[2]}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 120,
    padding: 16,
  },
  card: {
    backgroundColor: '#3E2723',
    borderRadius: 14,
    padding: 18,
    border: '2px solid #5D4037',
    boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
    width: '100%',
    maxWidth: 360,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    color: '#FFEFD5',
  },
  close: {
    backgroundColor: '#5D4037',
    color: '#FFEFD5',
    border: 'none',
    borderRadius: 8,
    width: 30,
    height: 30,
    fontSize: 14,
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
    overflowY: 'auto' as const,
  },
  levelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    textAlign: 'left' as const,
    backgroundColor: '#4E342E',
    border: '2px solid #5D4037',
    borderRadius: 10,
    padding: '12px 14px',
  },
  levelLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 3,
  },
  levelName: {
    fontSize: 15,
    fontWeight: 700,
    color: '#FFEFD5',
  },
  levelSub: {
    fontSize: 11,
    color: '#BCAAA4',
  },
  levelRight: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: 4,
  },
  levelGoal: {
    fontSize: 9,
    color: '#8D6E63',
    fontFamily: 'monospace',
    textAlign: 'right' as const,
  },
}
