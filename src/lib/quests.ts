import { Score, QuestsState, DailyQuest, MilestoneQuest } from './types'

// --- Constants ---

export const COIN_MILESTONES = [50, 100, 200, 400, 700, 1000, 1500, 2000, 3000, 5000]
export const REP_MILESTONES = [10, 25, 50, 80, 120, 180, 250, 350]

const DAILY_BONUS_COINS = 5
const DAILY_BONUS_REP = 1

// --- Daily quest templates ---

interface QuestTier {
  target: number
  reward: number
}

interface QuestTemplate {
  id: string
  descriptionPattern: string // e.g. "Get {N} correct answers"
  tiers: QuestTier[]
}

const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: 'correct_answers',
    descriptionPattern: 'Get {N} correct answers',
    tiers: [{ target: 10, reward: 4 }, { target: 20, reward: 7 }, { target: 30, reward: 10 }],
  },
  {
    id: 'earn_coins',
    descriptionPattern: 'Earn {N} coins',
    tiers: [{ target: 15, reward: 4 }, { target: 30, reward: 7 }, { target: 50, reward: 10 }],
  },
  {
    id: 'earn_rep',
    descriptionPattern: 'Earn {N} reputation',
    tiers: [{ target: 10, reward: 4 }, { target: 20, reward: 7 }, { target: 35, reward: 10 }],
  },
  {
    id: 'answer_streak',
    descriptionPattern: 'Get a {N}-answer streak',
    tiers: [{ target: 5, reward: 5 }, { target: 8, reward: 7 }, { target: 12, reward: 10 }],
  },
  {
    id: 'unique_characters',
    descriptionPattern: 'Talk to {N} different characters',
    tiers: [{ target: 4, reward: 4 }, { target: 7, reward: 6 }, { target: 10, reward: 9 }],
  },
  {
    id: 'serve_customers',
    descriptionPattern: 'Serve {N} customers',
    tiers: [{ target: 8, reward: 4 }, { target: 15, reward: 7 }, { target: 25, reward: 10 }],
  },
  {
    id: 'serve_perfectly',
    descriptionPattern: 'Serve {N} customers perfectly',
    tiers: [{ target: 3, reward: 5 }, { target: 6, reward: 7 }, { target: 10, reward: 10 }],
  },
  {
    id: 'no_hint_answers',
    descriptionPattern: 'Answer {N} questions without hints',
    tiers: [{ target: 8, reward: 5 }, { target: 15, reward: 7 }, { target: 25, reward: 10 }],
  },
  {
    id: 'total_questions',
    descriptionPattern: 'Answer {N} questions',
    tiers: [{ target: 20, reward: 4 }, { target: 40, reward: 7 }, { target: 60, reward: 10 }],
  },
]

// --- Helpers ---

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// --- Generation ---

export function generateDailyQuests(date: string): DailyQuest[] {
  const picked = shuffle(QUEST_TEMPLATES).slice(0, 5)
  return picked.map(template => {
    const tier = template.tiers[Math.floor(Math.random() * template.tiers.length)]
    return {
      templateId: template.id,
      description: template.descriptionPattern.replace('{N}', String(tier.target)),
      target: tier.target,
      progress: 0,
      claimed: false,
      reward: tier.reward,
    }
  })
}

export function getNextMilestones(coins: number, rep: number, currentMilestones?: MilestoneQuest[]): MilestoneQuest[] {
  // Find the next unclaimed coin milestone
  const claimedCoinIndex = currentMilestones
    ?.find(m => m.type === 'coins')?.stageIndex ?? -1
  const nextCoinIndex = claimedCoinIndex >= 0 && currentMilestones?.find(m => m.type === 'coins')?.claimed
    ? claimedCoinIndex + 1
    : Math.max(claimedCoinIndex, 0)

  // Find the next unclaimed rep milestone
  const claimedRepIndex = currentMilestones
    ?.find(m => m.type === 'reputation')?.stageIndex ?? -1
  const nextRepIndex = claimedRepIndex >= 0 && currentMilestones?.find(m => m.type === 'reputation')?.claimed
    ? claimedRepIndex + 1
    : Math.max(claimedRepIndex, 0)

  const milestones: MilestoneQuest[] = []

  if (nextCoinIndex < COIN_MILESTONES.length) {
    milestones.push({
      type: 'coins',
      target: COIN_MILESTONES[nextCoinIndex],
      stageIndex: nextCoinIndex,
      claimed: false,
    })
  }

  if (nextRepIndex < REP_MILESTONES.length) {
    milestones.push({
      type: 'reputation',
      target: REP_MILESTONES[nextRepIndex],
      stageIndex: nextRepIndex,
      claimed: false,
    })
  }

  return milestones
}

export function initializeQuests(date: string, coins: number, rep: number): QuestsState {
  return {
    date,
    dailyQuests: generateDailyQuests(date),
    dailyBonusClaimed: false,
    milestones: getNextMilestones(coins, rep),
    streak: 0,
    uniqueCharacters: [],
    currentConvoAllCorrect: true,
  }
}

/**
 * Reset daily quests for a new day while preserving milestone progress.
 */
export function resetDailyQuests(quests: QuestsState, date: string): QuestsState {
  return {
    ...quests,
    date,
    dailyQuests: generateDailyQuests(date),
    dailyBonusClaimed: false,
    streak: 0,
    uniqueCharacters: [],
    currentConvoAllCorrect: true,
  }
}

// --- Progress updates ---

export interface QuestEvent {
  score: Score
  characterId: string
  hintLevel: number
  coinsEarned: number
  repEarned: number
}

export function updateQuestProgress(quests: QuestsState, event: QuestEvent): QuestsState {
  const updated = { ...quests }
  const isCorrect = event.score !== 'MISSED'
  const noHint = event.hintLevel === 0

  // Update streak
  if (isCorrect) {
    updated.streak = quests.streak + 1
  } else {
    updated.streak = 0
  }

  // Track perfect conversation
  if (!isCorrect) {
    updated.currentConvoAllCorrect = false
  }

  // Update unique characters
  if (!quests.uniqueCharacters.includes(event.characterId)) {
    updated.uniqueCharacters = [...quests.uniqueCharacters, event.characterId]
  }

  // Update daily quest progress
  updated.dailyQuests = quests.dailyQuests.map(quest => {
    if (quest.claimed) return quest

    let newProgress = quest.progress
    switch (quest.templateId) {
      case 'correct_answers':
        if (isCorrect) newProgress += 1
        break
      case 'earn_coins':
        if (event.coinsEarned > 0) newProgress += event.coinsEarned
        break
      case 'earn_rep':
        if (event.repEarned > 0) newProgress += event.repEarned
        break
      case 'answer_streak':
        newProgress = Math.max(quest.progress, updated.streak)
        break
      case 'unique_characters':
        newProgress = updated.uniqueCharacters.length
        break
      case 'no_hint_answers':
        if (noHint && isCorrect) newProgress += 1
        break
      case 'total_questions':
        newProgress += 1
        break
      // serve_customers and serve_perfectly are handled at conversation end
    }

    if (newProgress !== quest.progress) {
      return { ...quest, progress: Math.min(newProgress, quest.target) }
    }
    return quest
  })

  return updated
}

/**
 * Update conversation-end quests (called when a conversation fully ends).
 * Handles serve_customers and serve_perfectly, then resets currentConvoAllCorrect.
 */
export function updateConversationEndProgress(quests: QuestsState): QuestsState {
  const wasPerfect = quests.currentConvoAllCorrect
  const updated = {
    ...quests,
    currentConvoAllCorrect: true, // reset for next conversation
    dailyQuests: quests.dailyQuests.map(quest => {
      if (quest.claimed) return quest

      let newProgress = quest.progress
      if (quest.templateId === 'serve_customers') {
        newProgress = Math.min(quest.progress + 1, quest.target)
      }
      if (quest.templateId === 'serve_perfectly' && wasPerfect) {
        newProgress = Math.min(quest.progress + 1, quest.target)
      }

      if (newProgress !== quest.progress) {
        return { ...quest, progress: newProgress }
      }
      return quest
    }),
  }
  return updated
}

// --- Claiming ---

export function claimDailyQuest(quests: QuestsState, questIndex: number): { quests: QuestsState; coins: number } {
  const quest = quests.dailyQuests[questIndex]
  if (!quest || quest.claimed || quest.progress < quest.target) {
    return { quests, coins: 0 }
  }

  const newDailyQuests = [...quests.dailyQuests]
  newDailyQuests[questIndex] = { ...quest, claimed: true }

  return {
    quests: { ...quests, dailyQuests: newDailyQuests },
    coins: quest.reward,
  }
}

export function claimDailyBonus(quests: QuestsState): { quests: QuestsState; coins: number; rep: number } {
  const allClaimed = quests.dailyQuests.every(q => q.claimed)
  if (!allClaimed || quests.dailyBonusClaimed) {
    return { quests, coins: 0, rep: 0 }
  }

  return {
    quests: { ...quests, dailyBonusClaimed: true },
    coins: DAILY_BONUS_COINS,
    rep: DAILY_BONUS_REP,
  }
}

export function milestoneReward(stageIndex: number): { coins: number; rep: number } {
  return {
    coins: Math.ceil(stageIndex * 3 + 5),
    rep: Math.ceil(stageIndex + 1),
  }
}

export function claimMilestone(quests: QuestsState, milestoneType: 'coins' | 'reputation'): {
  quests: QuestsState
  coins: number
  rep: number
} {
  const idx = quests.milestones.findIndex(m => m.type === milestoneType)
  if (idx === -1) return { quests, coins: 0, rep: 0 }

  const milestone = quests.milestones[idx]
  if (milestone.claimed) return { quests, coins: 0, rep: 0 }

  const reward = milestoneReward(milestone.stageIndex)
  const newMilestones = [...quests.milestones]
  newMilestones[idx] = { ...milestone, claimed: true }

  return {
    quests: { ...quests, milestones: newMilestones },
    coins: reward.coins,
    rep: reward.rep,
  }
}

/**
 * Advance milestones after claiming — replace claimed milestones with the next stage.
 */
export function advanceMilestones(quests: QuestsState): QuestsState {
  const newMilestones = quests.milestones.map(m => {
    if (!m.claimed) return m
    const arr = m.type === 'coins' ? COIN_MILESTONES : REP_MILESTONES
    const nextIndex = m.stageIndex + 1
    if (nextIndex >= arr.length) return null // all milestones complete
    return {
      type: m.type,
      target: arr[nextIndex],
      stageIndex: nextIndex,
      claimed: false,
    } as MilestoneQuest
  }).filter((m): m is MilestoneQuest => m !== null)

  return { ...quests, milestones: newMilestones }
}

// --- Utility ---

export function hasClaimableQuest(quests: QuestsState | undefined, coins?: number, rep?: number): boolean {
  if (!quests) return false
  const hasDailyClaimable = quests.dailyQuests.some(q => q.progress >= q.target && !q.claimed)
  const allClaimed = quests.dailyQuests.every(q => q.claimed)
  const hasBonusClaimable = allClaimed && !quests.dailyBonusClaimed
  const hasMilestoneClaimable = quests.milestones.some(m => {
    if (m.claimed) return false
    const current = m.type === 'coins' ? (coins ?? 0) : (rep ?? 0)
    return current >= m.target
  })
  return hasDailyClaimable || hasBonusClaimable || hasMilestoneClaimable
}
