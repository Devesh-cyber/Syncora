import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listActivity } from '../lib/activity.js'
import ActivityList from './ActivityList.jsx'
import { Card } from './ui.jsx'

// Latest few events for one room. Bump refreshKey to reload.
export default function RoomActivity({ roomId, meId, refreshKey = 0 }) {
  const [events, setEvents] = useState(null)

  useEffect(() => {
    let cancelled = false
    listActivity({ roomId, limit: 5 })
      .then((e) => !cancelled && setEvents(e))
      .catch(() => !cancelled && setEvents([]))
    return () => {
      cancelled = true
    }
  }, [roomId, refreshKey])

  if (!events || events.length === 0) return null

  return (
    <Card className="!py-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Recent activity</h2>
        <Link to={`/activity?room=${roomId}`} className="text-sm font-semibold text-brand">
          See all
        </Link>
      </div>
      <ActivityList events={events} meId={meId} />
    </Card>
  )
}
