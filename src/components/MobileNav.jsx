import { useState } from 'react'

/**
 * MobileNav — fixed bottom navigation bar, visible on sm screens only.
 * Handles wallet connect and tab switching on mobile.
 */
export function MobileNav({ activeTab, onTabChange, walletConnected, onConnectWallet, balance }) {
  const tabs = [
    { id: 'services', label: 'Services', icon: GridIcon },
    { id: 'activity', label: 'Activity',  icon: ActivityIcon },
    { id: 'wallet',   label: 'Wallet',    icon: WalletIcon },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      background: '#0a0a0a', borderTop: '1px solid #222',
      display: 'flex',
    }} className="md-hidden-nav">
      {tabs.map(tab => {
        const Icon = tab.icon
        const active = activeTab === tab.id
        const isWallet = tab.id === 'wallet'

        return (
          <button
            key={tab.id}
            onClick={() => {
              if (isWallet && !walletConnected) onConnectWallet()
              else onTabChange(tab.id)
            }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '4px', padding: '10px 0', background: 'none',
              border: 'none', borderTop: active ? '2px solid #e00055' : '2px solid transparent',
              color: active ? '#fff' : '#555', cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            <Icon active={active} />
            <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {isWallet && walletConnected && balance !== null ? `${balance} TIME` : tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

function GridIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}

function ActivityIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}

function WalletIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H6a2 2 0 01-2-2V6a2 2 0 012-2h14v4"/>
      <path d="M4 6v12a2 2 0 002 2h14v-4"/>
      <circle cx="17" cy="16" r="1" fill="currentColor"/>
    </svg>
  )
}