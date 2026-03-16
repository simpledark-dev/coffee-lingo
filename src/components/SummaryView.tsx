'use client'

import { DaySummary } from '../lib/types'
import { getRepLevel } from '../lib/upgrades'

interface SummaryViewProps {
  day: number
  summary: DaySummary
  reputation: number
  onContinue: () => void
}

export default function SummaryView({ day, summary, reputation, onContinue }: SummaryViewProps) {
  const rep = getRepLevel(reputation)

  return (
    <div className="summary">
      <div className="summary-title">Day {day} Complete!</div>

      <div className="summary-section">
        <h3>Customers</h3>
        <div className="summary-row">
          <span>Served</span>
          <span className="summary-value">
            {summary.customersServed}/{summary.totalCustomers}
          </span>
        </div>
        <div className="summary-row">
          <span>Perfect</span>
          <span className="summary-value score-PERFECT">{summary.scores.PERFECT}</span>
        </div>
        <div className="summary-row">
          <span>Good</span>
          <span className="summary-value score-GOOD">{summary.scores.GOOD}</span>
        </div>
        <div className="summary-row">
          <span>Understood</span>
          <span className="summary-value score-UNDERSTOOD">{summary.scores.UNDERSTOOD}</span>
        </div>
        <div className="summary-row">
          <span>Missed</span>
          <span className="summary-value score-MISSED">{summary.scores.MISSED}</span>
        </div>
      </div>

      <div className="summary-section">
        <h3>Earnings</h3>
        <div className="summary-row">
          <span>Coins earned</span>
          <span className="summary-value" style={{ color: 'var(--gold)' }}>
            +{summary.coinsEarned}
          </span>
        </div>
        <div className="summary-row">
          <span>Reputation</span>
          <span
            className="summary-value"
            style={{
              color:
                summary.reputationChange >= 0 ? 'var(--green)' : 'var(--red)',
            }}
          >
            {summary.reputationChange >= 0 ? '+' : ''}
            {summary.reputationChange}
          </span>
        </div>
        {/* Rep level bar */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span style={{ color: '#FFD54F', fontWeight: 600 }}>Lv{rep.current.level} {rep.current.title}</span>
            {rep.next && <span style={{ color: '#8D6E63' }}>{rep.next.minRep - reputation} to Lv{rep.next.level}</span>}
          </div>
          <div style={{ height: 8, backgroundColor: '#5D4037', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${rep.progress * 100}%`, backgroundColor: '#FFD54F', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      <div className="summary-section">
        <h3>Vocabulary</h3>
        <div className="summary-row">
          <span>Words practiced</span>
          <span className="summary-value">{summary.wordsPracticed}</span>
        </div>
        {summary.wordsLeveledUp.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {summary.wordsLeveledUp.map((wordId) => (
              <div key={wordId} className="summary-levelup">
                {wordId.replace(/_/g, ' ')} leveled up!
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="continue-button" onClick={onContinue}>
        Continue
      </button>
    </div>
  )
}
