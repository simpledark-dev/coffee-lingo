'use client'

import type { PlayerState, QuestsState } from '../lib/types'
import {
  claimDailyQuest,
  claimDailyBonus,
  claimMilestone,
  advanceMilestones,
  milestoneReward,
  COIN_MILESTONES,
  REP_MILESTONES,
} from '../lib/quests'

interface QuestsViewProps {
  playerState: PlayerState
  onStateUpdate: (updates: Partial<PlayerState>) => void
  onClose: () => void
}

export default function QuestsView({ playerState, onStateUpdate, onClose }: QuestsViewProps) {
  const quests = playerState.quests
  if (!quests) return null

  const allDailyClaimed = quests.dailyQuests.every(q => q.claimed)

  function handleClaimDaily(index: number) {
    if (!quests) return
    const { quests: newQuests, coins } = claimDailyQuest(quests, index)
    if (coins > 0) {
      onStateUpdate({
        coins: playerState.coins + coins,
        quests: newQuests,
      })
    }
  }

  function handleClaimBonus() {
    if (!quests) return
    const { quests: newQuests, coins, rep } = claimDailyBonus(quests)
    if (coins > 0 || rep > 0) {
      onStateUpdate({
        coins: playerState.coins + coins,
        reputation: playerState.reputation + rep,
        quests: newQuests,
      })
    }
  }

  function handleClaimMilestone(type: 'coins' | 'reputation') {
    if (!quests) return
    const { quests: newQuests, coins, rep } = claimMilestone(quests, type)
    if (coins > 0 || rep > 0) {
      const advanced = advanceMilestones(newQuests)
      onStateUpdate({
        coins: playerState.coins + coins,
        reputation: playerState.reputation + rep,
        quests: advanced,
      })
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerTitle}>Quests</span>
          <button style={styles.closeButton} onClick={onClose}>x</button>
        </div>

        <div style={styles.scrollArea}>
          {/* Daily Quests */}
          <div style={styles.sectionHeader}>Daily Quests</div>

          {quests.dailyQuests.map((quest, i) => {
            const complete = quest.progress >= quest.target
            const claimable = complete && !quest.claimed
            return (
              <div key={i} style={styles.card}>
                <div style={styles.cardRow}>
                  <span style={styles.questDesc}>{quest.description}</span>
                  <span style={styles.rewardText}>+{quest.reward} coins</span>
                </div>
                <div style={styles.progressBarBg}>
                  <div
                    style={{
                      ...styles.progressBarFill,
                      width: `${Math.min(100, (quest.progress / quest.target) * 100)}%`,
                    }}
                  />
                </div>
                <div style={styles.cardRow}>
                  <span style={styles.progressText}>
                    {quest.progress}/{quest.target}
                  </span>
                  {quest.claimed ? (
                    <span style={styles.claimedBadge}>Claimed</span>
                  ) : claimable ? (
                    <button style={styles.claimButton} onClick={() => handleClaimDaily(i)}>
                      Claim
                    </button>
                  ) : null}
                </div>
              </div>
            )
          })}

          {/* All-complete bonus */}
          {allDailyClaimed && !quests.dailyBonusClaimed && (
            <div style={{ ...styles.card, border: '2px solid #FFD54F' }}>
              <div style={styles.cardRow}>
                <span style={styles.questDesc}>All Daily Quests Complete!</span>
                <span style={styles.rewardText}>+5 coins +1 rep</span>
              </div>
              <button style={styles.claimButton} onClick={handleClaimBonus}>
                Claim Bonus
              </button>
            </div>
          )}
          {allDailyClaimed && quests.dailyBonusClaimed && (
            <div style={styles.card}>
              <div style={styles.cardRow}>
                <span style={styles.questDesc}>All Daily Quests Complete!</span>
                <span style={styles.claimedBadge}>Claimed</span>
              </div>
            </div>
          )}

          {/* Milestones */}
          {quests.milestones.length > 0 && (
            <>
              <div style={{ ...styles.sectionHeader, marginTop: 16 }}>Milestones</div>

              {quests.milestones.map((milestone, i) => {
                const currentValue = milestone.type === 'coins'
                  ? playerState.coins
                  : playerState.reputation
                const reached = currentValue >= milestone.target
                const reward = milestoneReward(milestone.stageIndex)
                const label = milestone.type === 'coins'
                  ? `Reach ${milestone.target} coins`
                  : `Reach ${milestone.target} reputation`
                const progress = Math.min(currentValue, milestone.target)

                return (
                  <div key={i} style={styles.card}>
                    <div style={styles.cardRow}>
                      <span style={styles.questDesc}>{label}</span>
                      <span style={styles.rewardText}>
                        +{reward.coins} coins +{reward.rep} rep
                      </span>
                    </div>
                    <div style={styles.progressBarBg}>
                      <div
                        style={{
                          ...styles.progressBarFill,
                          width: `${Math.min(100, (progress / milestone.target) * 100)}%`,
                        }}
                      />
                    </div>
                    <div style={styles.cardRow}>
                      <span style={styles.progressText}>
                        {progress}/{milestone.target}
                      </span>
                      {milestone.claimed ? (
                        <span style={styles.claimedBadge}>Claimed</span>
                      ) : reached ? (
                        <button
                          style={styles.claimButton}
                          onClick={() => handleClaimMilestone(milestone.type)}
                        >
                          Claim
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
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
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid #5D4037',
  },
  headerTitle: {
    color: '#FFD54F',
    fontSize: 18,
    fontWeight: 700,
    fontFamily: 'monospace',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#BCAAA4',
    fontSize: 20,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontWeight: 700,
  },
  scrollArea: {
    padding: '12px 16px',
    overflowY: 'auto',
    flex: 1,
  },
  sectionHeader: {
    color: '#BCAAA4',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'monospace',
    textTransform: 'uppercase' as const,
    marginBottom: 8,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#4E342E',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    border: '1px solid #6D4C41',
  },
  cardRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  questDesc: {
    color: '#FFEFD5',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 600,
    flex: 1,
  },
  rewardText: {
    color: '#FFD54F',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#3E2723',
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD54F',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  progressText: {
    color: '#BCAAA4',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  claimButton: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'monospace',
    cursor: 'pointer',
  },
  claimedBadge: {
    color: '#BCAAA4',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 600,
    fontStyle: 'italic' as const,
  },
}
