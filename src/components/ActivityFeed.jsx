import { useEventStream } from '../hooks/useEventStream.js'

const TYPE_COLORS = {
  join:     '#2dd4bf',
  list:     '#c084fc',
  book:     '#fbbf24',
  complete: '#4ade80',
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 10)   return 'just now'
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export function ActivityFeed() {
  const { events, connected, error } = useEventStream()

  return (
    <div style={{ borderTop: '1px solid #2a2a2a', marginTop: '8px', paddingTop: '8px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#888', textTransform: 'uppercase' }}>
          Live Activity
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: connected ? '#2dd4bf' : '#444',
          }} />
          <span style={{ fontSize: '10px', color: '#555' }}>
            {connected ? 'live' : 'connecting…'}
          </span>
        </div>
      </div>

      {/* Body */}
      {error && (
        <div style={{ fontSize: '11px', color: '#f59e0b', padding: '6px 0' }}>{error}</div>
      )}

      {!error && events.length === 0 && (
        <div style={{ fontSize: '11px', color: '#555', padding: '8px 0' }}>
          {connected ? 'No recent activity' : 'Connecting to Stellar…'}
        </div>
      )}

      {events.map(ev => (
        <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '5px 0', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{
            width: '7px', height: '7px', borderRadius: '50%', marginTop: '4px', flexShrink: 0,
            background: TYPE_COLORS[ev.type] || '#555',
          }} />
          <span style={{ fontSize: '11px', color: '#ccc', flex: 1, lineHeight: '1.4' }}>
            {ev.summary}
          </span>
          <span style={{ fontSize: '10px', color: '#555', whiteSpace: 'nowrap', marginTop: '2px' }}>
            {timeAgo(ev.timestamp)}
          </span>
        </div>
      ))}

      {events.length > 0 && (
        <div style={{ fontSize: '10px', color: '#444', textAlign: 'center', paddingTop: '6px' }}>
          Polling every 5s · {events.length} events
        </div>
      )}
    </div>
  )
}

export default ActivityFeed;