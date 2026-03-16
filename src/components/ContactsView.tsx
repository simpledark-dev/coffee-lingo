'use client'

import type { Relationship } from '../lib/types'
import { CHARACTER_ROSTER, getFriendshipLevel, type Character } from '../lib/characters'
import { CUSTOMER_SPRITES, PALETTE } from '../lib/sprites'

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

interface ContactsViewProps {
  relationships: Record<string, Relationship>
  reputation: number
  onClose: () => void
}

export default function ContactsView({ relationships, reputation, onClose }: ContactsViewProps) {
  const met = CHARACTER_ROSTER.filter(c => relationships[c.id])
  const locked = CHARACTER_ROSTER.filter(c => !relationships[c.id] && reputation >= c.unlockRep)
  const unknown = CHARACTER_ROSTER.filter(c => !relationships[c.id] && reputation < c.unlockRep)

  function renderCard(char: Character, rel?: Relationship) {
    const friendship = rel?.friendship ?? 0
    const fl = getFriendshipLevel(friendship)

    return (
      <div key={char.id} style={styles.card}>
        <img
          src={spriteToDataURL(char.spriteVariant, 48)}
          width={48}
          height={48}
          alt={char.name}
          style={{ imageRendering: 'pixelated' }}
        />
        <div style={styles.info}>
          <div style={styles.name}>{char.name}</div>
          <div style={styles.bio}>{char.bio}</div>
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
              <span style={{ color: '#FFD54F' }}>{fl.current.title}</span>
              {fl.next && <span style={{ color: '#8D6E63' }}>{fl.next.title}</span>}
            </div>
            <div style={styles.barBg}>
              <div style={{ ...styles.barFill, width: `${fl.progress * 100}%` }} />
            </div>
            {rel && (
              <div style={{ fontSize: 10, color: '#8D6E63', marginTop: 1 }}>
                Served {rel.timesServed} time{rel.timesServed !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>Contacts</span>
          <span style={styles.count}>{met.length}/{CHARACTER_ROSTER.length}</span>
          <button style={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        <div style={styles.list}>
          {met.length > 0 && (
            <>
              {met.map(c => renderCard(c, relationships[c.id]))}
            </>
          )}

          {locked.length > 0 && (
            <>
              <div style={styles.sectionLabel}>Not yet met</div>
              {locked.map(c => renderCard(c))}
            </>
          )}

          {unknown.length > 0 && (
            <>
              <div style={styles.sectionLabel}>???</div>
              {unknown.map(c => (
                <div key={c.id} style={{ ...styles.card, opacity: 0.4 }}>
                  <div style={styles.lockedAvatar}>?</div>
                  <div style={styles.info}>
                    <div style={styles.name}>???</div>
                    <div style={styles.bio}>Requires more reputation to unlock</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  panel: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85vh',
    backgroundColor: '#3E2723',
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '2px solid #5D4037',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '2px solid #5D4037',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 700,
    color: '#FFEFD5',
  },
  count: {
    fontSize: 14,
    color: '#8D6E63',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#FFEFD5',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  list: {
    overflowY: 'auto',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#8D6E63',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#4E342E',
    borderRadius: 10,
    padding: 10,
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    border: '1px solid #6D4C41',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
    color: '#FFEFD5',
  },
  bio: {
    fontSize: 12,
    color: '#BCAAA4',
    marginTop: 2,
  },
  barBg: {
    height: 6,
    backgroundColor: '#3E2723',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FFD54F',
    borderRadius: 3,
    transition: 'width 0.3s',
  },
  lockedAvatar: {
    width: 48,
    height: 48,
    backgroundColor: '#3E2723',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    color: '#5D4037',
    fontWeight: 700,
    flexShrink: 0,
  },
}
