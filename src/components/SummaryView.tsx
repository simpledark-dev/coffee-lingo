'use client'

import { DaySummary } from '../lib/types'

interface SummaryViewProps {
  day: number
  summary: DaySummary
  onContinue: () => void
}

export default function SummaryView({ day, summary, onContinue }: SummaryViewProps) {
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
