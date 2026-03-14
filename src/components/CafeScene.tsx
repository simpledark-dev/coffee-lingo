'use client'

import { ReactNode } from 'react'

interface CafeSceneProps {
  children: ReactNode
}

export default function CafeScene({ children }: CafeSceneProps) {
  return (
    <div style={styles.scene}>
      {/* Back wall */}
      <div style={styles.backWall}>
        {/* Shelf row 1 */}
        <div style={styles.shelfRow}>
          <div style={styles.shelf}>
            <div style={styles.shelfSurface} />
            <div style={styles.shelfItems}>
              <Cup color="#8B4513" />
              <Cup color="#D2691E" />
              <Jar color="#DAA520" />
              <Cup color="#A0522D" />
              <Jar color="#CD853F" />
            </div>
          </div>
        </div>
        {/* Shelf row 2 */}
        <div style={{ ...styles.shelfRow, top: 90 }}>
          <div style={styles.shelf}>
            <div style={styles.shelfSurface} />
            <div style={styles.shelfItems}>
              <Jar color="#8B6914" />
              <Cup color="#6B3A2A" />
              <Cup color="#A0522D" />
              <Jar color="#B8860B" />
            </div>
          </div>
        </div>

        {/* Menu board */}
        <div style={styles.menuBoard}>
          <div style={styles.menuBoardInner}>
            <div style={styles.menuTitle}>MENU</div>
            <div style={styles.menuLine} />
            <div style={styles.menuLine} />
            <div style={{ ...styles.menuLine, width: '60%' }} />
          </div>
        </div>

        {/* Hanging lamp */}
        <div style={styles.lamp}>
          <div style={styles.lampCord} />
          <div style={styles.lampShade} />
          <div style={styles.lampGlow} />
        </div>
      </div>

      {/* Counter */}
      <div style={styles.counter}>
        <div style={styles.counterTop} />
        <div style={styles.counterFront}>
          {/* Counter panels */}
          <div style={styles.counterPanel} />
          <div style={styles.counterPanel} />
          <div style={styles.counterPanel} />
        </div>
      </div>

      {/* Coffee machine on counter */}
      <div style={styles.coffeeMachine}>
        <div style={styles.machineBody} />
        <div style={styles.machineTop} />
        <div style={styles.machineDot} />
      </div>

      {/* Customer interaction area (overlaid on scene) */}
      <div style={styles.interactionArea}>
        {children}
      </div>
    </div>
  )
}

function Cup({ color }: { color: string }) {
  return (
    <div style={{
      width: 14,
      height: 18,
      background: color,
      borderRadius: '2px 2px 4px 4px',
      position: 'relative' as const,
    }}>
      <div style={{
        position: 'absolute' as const,
        right: -4,
        top: 4,
        width: 6,
        height: 8,
        border: `2px solid ${color}`,
        borderLeft: 'none',
        borderRadius: '0 4px 4px 0',
      }} />
    </div>
  )
}

function Jar({ color }: { color: string }) {
  return (
    <div style={{
      width: 18,
      height: 24,
      background: color,
      borderRadius: '3px 3px 5px 5px',
      opacity: 0.85,
      position: 'relative' as const,
    }}>
      <div style={{
        position: 'absolute' as const,
        top: 0,
        left: 2,
        right: 2,
        height: 5,
        background: '#654321',
        borderRadius: '2px 2px 0 0',
      }} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  scene: {
    position: 'relative',
    width: '100%',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #3E2723 0%, #4E342E 30%, #5D4037 100%)',
  },
  backWall: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 80,
    background: `
      linear-gradient(180deg, #5D4037 0%, #6D4C41 50%, #795548 100%)
    `,
    // Subtle wood grain
    backgroundImage: `
      linear-gradient(180deg, #5D4037 0%, #6D4C41 50%, #795548 100%),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 40px,
        rgba(0,0,0,0.03) 40px,
        rgba(0,0,0,0.03) 41px
      )
    `,
  },
  shelfRow: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 200,
  },
  shelf: {
    position: 'relative',
  },
  shelfSurface: {
    position: 'absolute',
    bottom: -4,
    left: -8,
    right: -8,
    height: 6,
    background: '#3E2723',
    borderRadius: 2,
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  shelfItems: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-end',
    paddingBottom: 4,
  },
  menuBoard: {
    position: 'absolute',
    top: 12,
    right: 20,
    width: 110,
    height: 80,
    background: '#2E2E2E',
    borderRadius: 4,
    border: '3px solid #5D4037',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBoardInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    width: '100%',
  },
  menuTitle: {
    color: '#FFEFD5',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
  },
  menuLine: {
    width: '80%',
    height: 2,
    background: 'rgba(255,239,213,0.3)',
    borderRadius: 1,
  },
  lamp: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  lampCord: {
    width: 2,
    height: 16,
    background: '#333',
  },
  lampShade: {
    width: 40,
    height: 20,
    background: 'linear-gradient(180deg, #D4A843 0%, #B8860B 100%)',
    borderRadius: '0 0 20px 20px',
    boxShadow: '0 2px 6px rgba(212,168,67,0.3)',
  },
  lampGlow: {
    position: 'absolute',
    bottom: -30,
    width: 120,
    height: 60,
    background: 'radial-gradient(ellipse, rgba(255,223,128,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  counter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  counterTop: {
    height: 8,
    background: 'linear-gradient(90deg, #5D4037 0%, #795548 50%, #5D4037 100%)',
    boxShadow: '0 -2px 6px rgba(0,0,0,0.2)',
    borderRadius: '2px 2px 0 0',
  },
  counterFront: {
    height: 72,
    background: 'linear-gradient(180deg, #4E342E 0%, #3E2723 100%)',
    display: 'flex',
    justifyContent: 'center',
    gap: 4,
    padding: '8px 20px',
  },
  counterPanel: {
    flex: 1,
    background: 'linear-gradient(180deg, #5D4037 0%, #4E342E 100%)',
    borderRadius: 3,
    border: '1px solid rgba(0,0,0,0.2)',
    maxWidth: 100,
  },
  coffeeMachine: {
    position: 'absolute',
    bottom: 78,
    right: 30,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  machineBody: {
    width: 36,
    height: 40,
    background: 'linear-gradient(180deg, #616161 0%, #424242 100%)',
    borderRadius: '4px 4px 2px 2px',
    border: '1px solid #333',
  },
  machineTop: {
    width: 28,
    height: 8,
    background: '#757575',
    borderRadius: '2px 2px 0 0',
    marginBottom: -1,
    order: -1,
  },
  machineDot: {
    position: 'absolute',
    top: 14,
    width: 6,
    height: 6,
    background: '#4CAF50',
    borderRadius: '50%',
    boxShadow: '0 0 4px rgba(76,175,80,0.6)',
  },
  interactionArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 90,
    pointerEvents: 'none',
  },
}
