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
    <div style={{ display: 'flex', gap: 1 }}>
      {[1, 2, 3].map(i => (
        <span key={i} style={{ fontSize: 13, color: i <= count ? '#FFD54F' : '#5D4037' }}>
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

        <div style={styles.grid}>
          {LEVELS.map(level => {
            const progress = levelProgress[level.id]
            const unlocked = isLevelUnlocked(level.id, levelProgress)
            return (
              <button
                key={level.id}
                style={{ ...styles.cell, opacity: unlocked ? 1 : 0.5, cursor: unlocked ? 'pointer' : 'default' }}
                disabled={!unlocked}
                onClick={() => unlocked && onStartLevel(level)}
              >
                {!unlocked && <span style={styles.lock}>🔒</span>}
                <div style={styles.cellLevel}>Level {level.id}</div>
                <div style={styles.cellTitle}>{level.name}</div>
                <Stars count={progress?.stars ?? 0} />
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
    maxWidth: 400,
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    overflowY: 'auto' as const,
  },
  cell: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 78,
    padding: '10px 6px',
    backgroundColor: '#4E342E',
    border: '2px solid #5D4037',
    borderRadius: 10,
  },
  lock: {
    position: 'absolute' as const,
    top: 4,
    right: 6,
    fontSize: 11,
  },
  cellLevel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#8D6E63',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  cellTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#FFEFD5',
    textAlign: 'center' as const,
    lineHeight: 1.15,
  },
}
