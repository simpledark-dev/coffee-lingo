'use client'

import { useState } from 'react'
import type { PlayerState } from '../lib/types'
import { getUpgradeCatalogEntry, getRepLevel } from '../lib/upgrades'
import UpgradeShop from './UpgradeShop'
import ContactsView from './ContactsView'

interface DayStartViewProps {
  day: number
  coins: number
  playerState: PlayerState
  readyToInstallIds: string[]
  onOpenShop: () => void
  onPurchase: (upgradeId: string, tier: number, cost: number, durationMs: number) => void
  onInstall: (upgradeId: string) => void
  onDebugSet: (field: 'coins' | 'reputation', value: number) => void
  onReset: () => void
  onFinishUpgrade: (upgradeId: string) => void
}

export default function DayStartView({
  day,
  coins,
  playerState,
  readyToInstallIds,
  onOpenShop,
  onPurchase,
  onInstall,
  onDebugSet,
  onReset,
  onFinishUpgrade,
}: DayStartViewProps) {
  const [showShop, setShowShop] = useState(false)
  const [editingField, setEditingField] = useState<'coins' | 'reputation' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showContacts, setShowContacts] = useState(false)

  return (
    <div className="day-start">
      {/* Ready to install notifications */}
      {readyToInstallIds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '0 20px', width: 'calc(100% - 40px)' }}>
          {readyToInstallIds.map((id) => {
            const entry = getUpgradeCatalogEntry(id)
            return (
              <div key={id} style={bannerStyle}>
                <div style={{ flex: 1 }}>
                  <strong>{entry?.displayName ?? id}</strong> is ready!
                </div>
                <button
                  style={installBtnStyle}
                  onClick={() => onInstall(id)}
                >
                  Install
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div>
        <div className="day-number">Day {day}</div>
        <div className="day-subtitle">Time to open the cafe</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 4 }}>
          {editingField === 'coins' ? (
            <input
              autoFocus
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => { onDebugSet('coins', Number(editValue) || 0); setEditingField(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { onDebugSet('coins', Number(editValue) || 0); setEditingField(null) } }}
              style={debugInputStyle}
            />
          ) : (
            <span
              style={{ color: '#FFD54F', fontSize: 14, cursor: 'pointer' }}
              onClick={() => { setEditingField('coins'); setEditValue(String(coins)) }}
            >
              {coins} coins
            </span>
          )}
          {editingField === 'reputation' ? (
            <input
              autoFocus
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => { onDebugSet('reputation', Number(editValue) || 0); setEditingField(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { onDebugSet('reputation', Number(editValue) || 0); setEditingField(null) } }}
              style={debugInputStyle}
            />
          ) : (
            <span
              style={{ color: '#BCAAA4', fontSize: 14, cursor: 'pointer' }}
              onClick={() => { setEditingField('reputation'); setEditValue(String(playerState.reputation)) }}
            >
              {playerState.reputation} rep
            </span>
          )}
        </div>
        {(() => {
          const rep = getRepLevel(playerState.reputation)
          return (
            <div style={{ marginTop: 8, width: '60%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: '#FFD54F', fontWeight: 600 }}>Lv{rep.current.level} {rep.current.title}</span>
                {rep.next && <span style={{ color: '#8D6E63' }}>Lv{rep.next.level}</span>}
              </div>
              <div style={{ height: 8, backgroundColor: '#5D4037', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${rep.progress * 100}%`, backgroundColor: '#FFD54F', borderRadius: 4, transition: 'width 0.3s' }} />
              </div>
              {rep.next && (
                <div style={{ fontSize: 10, color: '#8D6E63', marginTop: 2, textAlign: 'right' as const }}>
                  {rep.next.minRep - playerState.reputation} to {rep.next.title}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', padding: '0 20px' }}>
        <button className="open-shop-button" onClick={onOpenShop}>
          Open Shop
        </button>
        <button
          className="open-shop-button"
          style={{ backgroundColor: '#5D4037' }}
          onClick={() => setShowShop(true)}
        >
          Upgrades
        </button>
        <button
          className="open-shop-button"
          style={{ backgroundColor: '#5D4037' }}
          onClick={() => setShowContacts(true)}
        >
          Contacts
        </button>
        <button
          style={resetBtnStyle}
          onClick={() => { if (confirm('Reset all progress?')) onReset() }}
        >
          Reset Game
        </button>
      </div>

      {showContacts && (
        <ContactsView
          relationships={playerState.relationships ?? {}}
          reputation={playerState.reputation}
          onClose={() => setShowContacts(false)}
        />
      )}

      {showShop && (
        <UpgradeShop
          playerState={playerState}
          onPurchase={onPurchase}
          onInstall={onInstall}
          onFinishUpgrade={onFinishUpgrade}
          onClose={() => setShowShop(false)}
        />
      )}
    </div>
  )
}

const bannerStyle: React.CSSProperties = {
  backgroundColor: '#FFD54F',
  color: '#3E2723',
  padding: '10px 16px',
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 14,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const debugInputStyle: React.CSSProperties = {
  width: 80,
  backgroundColor: '#5D4037',
  color: '#FFD54F',
  border: '1px solid #FFD54F',
  borderRadius: 6,
  padding: '2px 6px',
  fontSize: 14,
  textAlign: 'center',
  outline: 'none',
}

const resetBtnStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: '#8D6E63',
  border: '1px solid #5D4037',
  borderRadius: 8,
  padding: '6px 0',
  fontSize: 12,
  cursor: 'pointer',
}

const installBtnStyle: React.CSSProperties = {
  backgroundColor: '#3E2723',
  color: '#FFD54F',
  border: 'none',
  borderRadius: 8,
  padding: '6px 16px',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
}
