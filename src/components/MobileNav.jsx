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
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-100 safe-area-pb">
      <div className="flex">
        {tabs.map(tab => {
          const Icon    = tab.icon
          const active  = activeTab === tab.id
          const isWallet = tab.id === 'wallet'

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (isWallet && !walletConnected) {
                  onConnectWallet()
                } else {
                  onTabChange(tab.id)
                }
              }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors
                ${active ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Icon active={active} />
              <span className="text-[10px] font-medium">
                {isWallet && walletConnected && balance !== null
                  ? `${balance} TIME`
                  : tab.label}
              </span>
              {active && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-teal-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function GridIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}

function WalletIcon({ active }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H6a2 2 0 01-2-2V6a2 2 0 012-2h14v4"/>
      <path d="M4 6v12a2 2 0 002 2h14v-4"/>
      <circle cx="17" cy="16" r="1" fill="currentColor"/>
    </svg>
  )
}