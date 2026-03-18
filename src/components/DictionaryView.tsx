'use client'

import { useState, useCallback } from 'react'
import type { Expression, VocabularyEntry } from '../lib/types'

interface DictionaryViewProps {
  expressions: Expression[]
  vocabulary: Record<string, VocabularyEntry>
  onClose: () => void
}

const LEVEL_LABELS = ['Novice', 'Familiar', 'Confident', 'Mastered']
const LEVEL_COLORS = ['#8D6E63', '#FFCC80', '#FFD54F', '#4CAF50']

type Filter = 'all' | 'learning' | 'mastered'
type SortMode = 'alpha' | 'most-correct' | 'most-wrong' | 'worst-ratio'

const SORT_LABELS: Record<SortMode, string> = {
  'alpha': 'A-Z',
  'most-correct': '✓ Most correct',
  'most-wrong': '✗ Most wrong',
  'worst-ratio': '% Worst ratio',
}

export default function DictionaryView({ expressions, vocabulary, onClose }: DictionaryViewProps) {
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('alpha')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const speakWord = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'de-DE'
    utter.rate = 0.85
    window.speechSynthesis.speak(utter)
  }, [])

  // Render example sentence with {German} words highlighted
  const renderExample = (text: string) => {
    const parts = text.split(/(\{[^}]+\})/)
    return parts.map((part, i) => {
      if (part.startsWith('{') && part.endsWith('}')) {
        const word = part.slice(1, -1)
        return <span key={i} style={styles.highlightWord}>{word}</span>
      }
      return <span key={i}>{part}</span>
    })
  }

  const masteredCount = expressions.filter(e => (vocabulary[e.id]?.masteryLevel ?? 0) >= 3).length

  const filtered = expressions
    .filter(e => {
      const level = vocabulary[e.id]?.masteryLevel ?? 0
      if (activeFilter === 'learning') return level < 3
      if (activeFilter === 'mastered') return level >= 3
      return true
    })
    .sort((a, b) => {
      const ea = vocabulary[a.id]
      const eb = vocabulary[b.id]
      switch (sortMode) {
        case 'most-correct': {
          const diff = (eb?.totalSuccessfulUses ?? 0) - (ea?.totalSuccessfulUses ?? 0)
          return diff !== 0 ? diff : a.text.localeCompare(b.text)
        }
        case 'most-wrong': {
          const wa = ea?.totalWrong ?? 0
          const wb = eb?.totalWrong ?? 0
          const seenA = (ea?.totalSuccessfulUses ?? 0) + wa > 0
          const seenB = (eb?.totalSuccessfulUses ?? 0) + wb > 0
          if (seenA && !seenB) return -1
          if (!seenA && seenB) return 1
          const diff = wb - wa
          return diff !== 0 ? diff : a.text.localeCompare(b.text)
        }
        case 'worst-ratio': {
          const totalA = (ea?.totalSuccessfulUses ?? 0) + (ea?.totalWrong ?? 0)
          const totalB = (eb?.totalSuccessfulUses ?? 0) + (eb?.totalWrong ?? 0)
          const ratioA = totalA > 0 ? (ea?.totalSuccessfulUses ?? 0) / totalA : -1
          const ratioB = totalB > 0 ? (eb?.totalSuccessfulUses ?? 0) / totalB : -1
          // Unseen words (-1) go to bottom; lower ratio = worse = first
          if (ratioA < 0 && ratioB >= 0) return 1
          if (ratioB < 0 && ratioA >= 0) return -1
          const diff = ratioA - ratioB
          return diff !== 0 ? diff : a.text.localeCompare(b.text)
        }
        default: {
          const la = ea?.masteryLevel ?? 0
          const lb = eb?.masteryLevel ?? 0
          if (la !== lb) return la - lb
          return a.text.localeCompare(b.text)
        }
      }
    })

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <span style={styles.title}>Dictionary</span>
            <span style={styles.count}>{masteredCount}/{expressions.length} mastered</span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>X</button>
        </div>

        {/* Filter tabs */}
        <div style={styles.tabBar}>
          {(['all', 'learning', 'mastered'] as Filter[]).map(f => (
            <button
              key={f}
              style={{
                ...styles.tab,
                ...(activeFilter === f ? styles.tabActive : {}),
              }}
              onClick={() => setActiveFilter(f)}
            >
              {f === 'all' ? `All (${expressions.length})` : f === 'learning' ? `Learning (${expressions.length - masteredCount})` : `Mastered (${masteredCount})`}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div style={styles.sortBar}>
          {(['alpha', 'most-correct', 'most-wrong', 'worst-ratio'] as SortMode[]).map(s => (
            <button
              key={s}
              style={{
                ...styles.sortBtn,
                ...(sortMode === s ? styles.sortBtnActive : {}),
              }}
              onClick={() => setSortMode(s)}
            >
              {SORT_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Word list */}
        <div className="dictionary-list" style={styles.list}>
          {filtered.map(expr => {
            const entry = vocabulary[expr.id]
            const level = entry?.masteryLevel ?? 0
            const uses = entry?.totalSuccessfulUses ?? 0
            const wrong = entry?.totalWrong ?? 0
            const total = uses + wrong
            const ratio = total > 0 ? Math.round((uses / total) * 100) : null

            const isExpanded = expandedId === expr.id

            return (
              <div
                key={expr.id}
                style={styles.card}
                onClick={() => setExpandedId(isExpanded ? null : expr.id)}
              >
                <div style={styles.cardTop}>
                  <div style={{ flex: 1 }}>
                    <div style={styles.french}>{expr.text}</div>
                    <div style={styles.english}>{expr.nativeText}</div>
                  </div>
                  <button
                    style={styles.audioBtn}
                    onClick={(e) => { e.stopPropagation(); speakWord(expr.text) }}
                  >
                    🔊
                  </button>
                  <div style={styles.levelBadge}>
                    <span style={{ color: LEVEL_COLORS[level], fontWeight: 700, fontSize: 11 }}>
                      {LEVEL_LABELS[level]}
                    </span>
                  </div>
                </div>

                {/* Mastery bar — 4 segments */}
                <div style={styles.masteryBar}>
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      style={{
                        ...styles.masterySegment,
                        backgroundColor: i <= level ? LEVEL_COLORS[Math.min(level, 3)] : '#5D4037',
                      }}
                    />
                  ))}
                </div>

                <div style={styles.cardBottom}>
                  {/* Idea tags */}
                  <div style={styles.tags}>
                    {expr.ideaTags.map(tag => (
                      <span key={tag} style={styles.tag}>{tag}</span>
                    ))}
                  </div>
                  <div style={styles.uses}>
                    {uses}✓ {wrong}✗{ratio !== null ? ` · ${ratio}%` : ''} · {entry?.successfulDays ?? 0}d
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={styles.expandedSection}>
                    {expr.definition && (
                      <div style={styles.definition}>{expr.definition}</div>
                    )}
                    {expr.examples && expr.examples.length > 0 && (
                      <div style={styles.examplesSection}>
                        {expr.examples.map((ex, i) => (
                          <div key={i} style={styles.example}>
                            {renderExample(ex)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: '#8D6E63', padding: 20, fontSize: 13 }}>
              No words in this category yet
            </div>
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
    minHeight: '85vh',
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
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '2px solid #5D4037',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#FFEFD5',
    marginRight: 10,
  },
  count: {
    fontSize: 12,
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
  tabBar: {
    display: 'flex',
    borderBottom: '2px solid #5D4037',
    padding: '0 8px',
  },
  tab: {
    flex: 1,
    padding: '10px 0',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid' as const,
    borderBottomColor: 'transparent',
    marginBottom: -2,
    color: '#8D6E63',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  tabActive: {
    color: '#FFD54F',
    borderBottomColor: '#FFD54F',
  },
  sortBar: {
    display: 'flex',
    gap: 4,
    padding: '8px 12px',
    borderBottom: '1px solid #5D4037',
    flexWrap: 'wrap' as const,
  },
  sortBtn: {
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 600,
    color: '#8D6E63',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'solid' as const,
    borderColor: '#5D4037',
    borderRadius: 6,
    cursor: 'pointer',
  },
  sortBtnActive: {
    color: '#FFEFD5',
    backgroundColor: '#5D4037',
    borderColor: '#8D6E63',
  },
  list: {
    overflowY: 'auto',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  card: {
    backgroundColor: '#4E342E',
    borderRadius: 10,
    padding: 12,
    border: '1px solid #6D4C41',
    cursor: 'pointer',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
  },
  french: {
    fontSize: 18,
    fontWeight: 700,
    color: '#FFEFD5',
  },
  english: {
    fontSize: 13,
    color: '#BCAAA4',
    marginTop: 2,
  },
  levelBadge: {
    padding: '2px 8px',
    backgroundColor: '#3E2723',
    borderRadius: 8,
    whiteSpace: 'nowrap' as const,
  },
  masteryBar: {
    display: 'flex',
    gap: 3,
    marginTop: 8,
  },
  masterySegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  cardBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  tags: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap' as const,
  },
  tag: {
    fontSize: 10,
    color: '#BCAAA4',
    backgroundColor: '#3E2723',
    padding: '2px 6px',
    borderRadius: 4,
  },
  uses: {
    fontSize: 11,
    color: '#FFD54F',
    whiteSpace: 'nowrap' as const,
  },
  audioBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  expandedSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid #6D4C41',
  },
  definition: {
    fontSize: 13,
    color: '#FFEFD5',
    lineHeight: 1.5,
    marginBottom: 8,
  },
  examplesSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  example: {
    fontSize: 12,
    color: '#BCAAA4',
    lineHeight: 1.5,
    paddingLeft: 8,
    borderLeft: '2px solid #6D4C41',
  },
  highlightWord: {
    color: '#FFD54F',
    fontWeight: 700,
  },
}
