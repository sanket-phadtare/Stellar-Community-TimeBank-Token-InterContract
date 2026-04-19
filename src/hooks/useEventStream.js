import { useState, useEffect, useRef, useCallback } from 'react'
import * as StellarSdk from '@stellar/stellar-sdk'
import { RPC_URL, CONTRACT_ID } from '../utils/contract.js'

const POLL_INTERVAL_MS = 5000
const MAX_EVENTS       = 30

/**
 * useEventStream — polls Stellar RPC getEvents every 5s and returns
 * a live list of human-readable activity items.
 *
 * Returns:
 *   events    Array<{ id, type, summary, timestamp }>
 *   connected boolean  (true once first poll succeeds)
 *   error     string | null
 */
export function useEventStream() {
  const [events, setEvents]       = useState([])
  const [connected, setConnected] = useState(false)
  const [error, setError]         = useState(null)

  // Track the latest ledger we've already processed so we don't re-show old events
  const cursorRef    = useRef(null)
  const intervalRef  = useRef(null)
  const rpc          = useRef(new StellarSdk.rpc.Server(RPC_URL))

  const poll = useCallback(async () => {
    try {
      const params = {
        filters: [
          {
            type:        'contract',
            contractIds: [CONTRACT_ID],
          },
        ],
        limit: 20,
      }

      // If we have a cursor, only fetch events after it
      if (cursorRef.current) {
        params.startLedger = cursorRef.current
      } else {
        // First poll: start from ~100 ledgers ago (roughly 8 minutes of history)
        const latestLedger = await rpc.current.getLatestLedger()
        params.startLedger = Math.max(1, latestLedger.sequence - 100)
      }

      const response = await rpc.current.getEvents(params)

      if (response.events && response.events.length > 0) {
        const parsed = response.events
          .map(parseEvent)
          .filter(Boolean)
          .reverse() // newest first

        setEvents(prev => {
          const combined = [...parsed, ...prev]
          // Deduplicate by id
          const seen = new Set()
          return combined
            .filter(e => {
              if (seen.has(e.id)) return false
              seen.add(e.id)
              return true
            })
            .slice(0, MAX_EVENTS)
        })

        // Advance cursor to the latest ledger seen
        const latestSeen = response.events[response.events.length - 1]
        if (latestSeen?.ledger) {
          cursorRef.current = latestSeen.ledger + 1
        }
      }

      setConnected(true)
      setError(null)
    } catch (e) {
      // Don't show error on first load — RPC can be slow to warm up
      if (connected) {
        setError('Event stream interrupted — retrying…')
      }
    }
  }, [connected])

  useEffect(() => {
    poll() // immediate first fetch
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(intervalRef.current)
  }, [poll])

  return { events, connected, error }
}

// ── Event parser ──────────────────────────────────────────────────────────────
// Converts raw Stellar contract event data into a human-readable object.

function parseEvent(raw) {
  try {
    const topics = raw.topic.map(t => StellarSdk.scValToNative(t))
    // topics[0] = "timebank", topics[1] = action name
    if (topics[0] !== 'timebank') return null

    const action    = topics[1]
    const data      = StellarSdk.scValToNative(raw.value)
    const timestamp = Date.now() // RPC doesn't give ms timestamps, use now
    const id        = raw.id || `${raw.ledger}-${raw.pagingToken}`

    switch (action) {
      case 'joined': {
        const [member] = data
        return {
          id,
          type:      'join',
          summary:   `${shortAddr(member)} joined the Time Bank`,
          timestamp,
        }
      }
      case 'listed': {
        const [serviceId, provider, title, hours] = data
        return {
          id,
          type:    'list',
          summary: `${shortAddr(provider)} listed "${title}" for ${hours} TIME`,
          timestamp,
        }
      }
      case 'booked': {
        const [bookingId, serviceId, requester, provider, hours] = data
        return {
          id,
          type:    'book',
          summary: `${shortAddr(requester)} booked ${hours}h from ${shortAddr(provider)}`,
          timestamp,
        }
      }
      case 'completed': {
        const [bookingId, requester, provider, hours] = data
        return {
          id,
          type:    'complete',
          summary: `${shortAddr(requester)} confirmed ${hours}h with ${shortAddr(provider)}`,
          timestamp,
        }
      }
      default:
        return null
    }
  } catch {
    return null
  }
}

function shortAddr(addr) {
  if (!addr || typeof addr !== 'string') return '???'
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}