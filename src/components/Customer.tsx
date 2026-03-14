'use client'

import { useEffect, useState } from 'react'
import { Score } from '../lib/types'

interface CustomerProps {
  customerLine: string
  patiencePercent: number
  hintLevel: number
  hintIdea: string
  hintTranslation: string
  onHint: () => void
  // Transition state
  phase: 'entering' | 'present' | 'exiting' | 'score'
  scoreResult?: { score: Score; tipAmount: number } | null
  customerKey: number // changes when customer changes, drives transitions
}

export default function Customer({
  customerLine,
  patiencePercent,
  hintLevel,
  hintIdea,
  hintTranslation,
  onHint,
  phase,
  scoreResult,
}: CustomerProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (phase === 'entering') {
      // Start off-screen, then animate in
      setVisible(false)
      const timer = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(timer)
    } else if (phase === 'present' || phase === 'score') {
      setVisible(true)
    } else if (phase === 'exiting') {
      setVisible(false)
    }
  }, [phase])

  const translateX = phase === 'exiting' ? '-120%' : visible ? '0%' : '120%'

  return (
    <div style={{
      ...customerStyles.wrapper,
      transform: `translateX(${translateX})`,
      opacity: visible && phase !== 'exiting' ? 1 : 0,
      transition: 'transform 0.4s ease-out, opacity 0.3s ease-out',
      pointerEvents: 'auto',
    }}>
      {/* Customer silhouette */}
      <div style={customerStyles.silhouette}>
        {/* Head */}
        <div style={customerStyles.head} />
        {/* Body */}
        <div style={customerStyles.body} />
        {/* Shoulder accents */}
        <div style={customerStyles.shoulderLeft} />
        <div style={customerStyles.shoulderRight} />
      </div>

      {/* Patience bar - above customer */}
      {phase === 'present' && (
        <div style={customerStyles.patienceContainer}>
          <div
            style={{
              ...customerStyles.patienceBar,
              width: `${patiencePercent}%`,
              background: patiencePercent > 40 ? '#4CAF50' : patiencePercent > 15 ? '#FF9800' : '#F44336',
            }}
          />
        </div>
      )}

      {/* Speech bubble */}
      {(phase === 'present' || phase === 'entering') && (
        <div style={customerStyles.speechBubble}>
          <div style={customerStyles.speechText}>{customerLine}</div>
          <div style={customerStyles.speechTail} />

          {/* Hints */}
          {hintLevel >= 1 && (
            <div style={customerStyles.hintText}>{hintIdea}</div>
          )}
          {hintLevel >= 2 && (
            <div style={customerStyles.hintTranslation}>{hintTranslation}</div>
          )}
        </div>
      )}

      {/* Hint button */}
      {phase === 'present' && (
        <button style={customerStyles.hintButton} onClick={onHint}>
          ?
        </button>
      )}

      {/* Score display */}
      {phase === 'score' && scoreResult && (
        <div style={customerStyles.scoreContainer}>
          <div style={{
            ...customerStyles.scoreText,
            color: scoreColors[scoreResult.score],
          }}>
            {scoreResult.score}
          </div>
          {scoreResult.tipAmount > 0 && (
            <div style={customerStyles.tipText}>
              +{scoreResult.tipAmount} coins
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const scoreColors: Record<Score, string> = {
  PERFECT: '#FFD700',
  GOOD: '#4CAF50',
  UNDERSTOOD: '#9E9E9E',
  MISSED: '#F44336',
}

const customerStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  silhouette: {
    position: 'relative',
    width: 60,
    height: 80,
  },
  head: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'linear-gradient(180deg, #8D6E63 0%, #6D4C41 100%)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  body: {
    position: 'absolute',
    top: 28,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 50,
    height: 52,
    borderRadius: '12px 12px 6px 6px',
    background: 'linear-gradient(180deg, #5C6BC0 0%, #3F51B5 100%)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  },
  shoulderLeft: {
    position: 'absolute',
    top: 32,
    left: 0,
    width: 12,
    height: 24,
    borderRadius: '8px 0 0 8px',
    background: '#3F51B5',
  },
  shoulderRight: {
    position: 'absolute',
    top: 32,
    right: 0,
    width: 12,
    height: 24,
    borderRadius: '0 8px 8px 0',
    background: '#3F51B5',
  },
  patienceContainer: {
    width: 70,
    height: 5,
    background: 'rgba(0,0,0,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'absolute',
    top: -10,
    left: '50%',
    transform: 'translateX(-50%)',
  },
  patienceBar: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.5s linear, background 0.3s',
  },
  speechBubble: {
    position: 'absolute',
    bottom: 85,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#FFFEF7',
    borderRadius: 16,
    padding: '12px 16px',
    minWidth: 180,
    maxWidth: 280,
    boxShadow: '0 3px 12px rgba(0,0,0,0.15)',
    textAlign: 'center',
  },
  speechText: {
    fontSize: 17,
    fontWeight: 500,
    color: '#2C1810',
    lineHeight: 1.4,
  },
  speechTail: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderRight: '8px solid transparent',
    borderTop: '8px solid #FFFEF7',
  },
  hintText: {
    marginTop: 8,
    fontSize: 13,
    color: '#8B6F47',
    fontStyle: 'italic',
    borderTop: '1px solid rgba(139,111,71,0.2)',
    paddingTop: 6,
  },
  hintTranslation: {
    marginTop: 4,
    fontSize: 13,
    color: '#A0845C',
    fontStyle: 'italic',
  },
  hintButton: {
    position: 'absolute',
    bottom: 90,
    right: -45,
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.4)',
    background: 'rgba(93,64,55,0.8)',
    color: '#FFEFD5',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  },
  scoreContainer: {
    position: 'absolute',
    bottom: 90,
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
    textShadow: '0 2px 8px rgba(0,0,0,0.5)',
    textTransform: 'uppercase',
  },
  tipText: {
    fontSize: 16,
    fontWeight: 600,
    color: '#FFD700',
    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
  },
}
