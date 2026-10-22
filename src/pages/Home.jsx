import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { listMyRooms } from '../lib/rooms.js'
import { createTask, deleteTask, listMyDashboardTasks, setTaskDone, sortPending, updateTask } from '../lib/tasks.js'
import { listActivity } from '../lib/activity.js'
import { todayISO, toISODate } from '../lib/dates.js'
import TaskItem from '../components/tasks/TaskItem.jsx'
import TaskComposer from '../components/tasks/TaskComposer.jsx'
import TaskEditor from '../components/tasks/TaskEditor.jsx'
import ActivityList from '../components/ActivityList.jsx'
import ReactionBar from '../components/tasks/ReactionBar.jsx'
import { groupReactions, listReactionsForTasks } from '../lib/reactions.js'
import { getMyStreak } from '../lib/streaks.js'
import { useLiveRefresh } from '../lib/useLiveRefresh.js'
import ReminderBanner from '../components/ReminderBanner.jsx'
import InstallCard from '../components/InstallCard.jsx'
import { Card, ErrorNote, Spinner } from '../components/ui.jsx'

const LAST_ROOM_KEY = 'syncora:lastRoom'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function readLastRoom() {
  try {
    return localStorage.getItem(LAST_ROOM_KEY)
  } catch {
    return null
  }
}

export default function Home() {
  const { user, profile } = useAuth()
  const [rooms, setRooms] = useState(null)
  const [tasks, setTasks] = useState(null)
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [composerRoom, setComposerRoom] = useState(readLastRoom)
  const [showLater, setShowLater] = useState(false)
  const [streak, setStreak] = useState(null)
  const [reactions, setReactions] = useState({})

  const refreshStreak = useCallback(() => {
    getMyStreak()
      .then(setStreak)
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setError(null)
    try {
      const [r, t, e] = await Promise.all([listMyRooms(), listMyDashboardTasks(user.id), listActivity({ limit: 5 })])
      setRooms(r)
      setTasks(t)
      setEvents(e)
      refreshStreak()
      // Reactions people left on the tasks you finished today.
      listReactionsForTasks(t.filter((x) => x.completed_at).map((x) => x.id))
        .then((rows) => setReactions(groupReactions(rows)))
        .catch(() => {})
    } catch (err) {
      setError(err.message)
    }
  }, [user.id, refreshStreak])

  useEffect(() => {
    load()
  }, [load])

  // Live: your tasks, cheers, room membership, and the feed.
  useLiveRefresh(
    `home:${user.id}`,
    [
      { table: 'tasks', filter: `owner_id=eq.${user.id}` },
      { table: 'room_members', filter: `user_id=eq.${user.id}` },
      { table: 'rooms' },
      { table: 'reactions' },
      { table: 'activity_events' },
    ],
    load,
  )

  // Keep the composer's room valid (e.g. after leaving the remembered room).
  const selectedRoomId = rooms?.some((r) => r.id === composerRoom) ? composerRoom : rooms?.[0]?.id ?? null

  const { todo, later, doneToday } = useMemo(() => {
    if (!tasks) return { todo: [], later: [], doneToday: [] }
    const today = todayISO()
    const pending = tasks.filter((t) => !t.completed_at)
    return {
      // overdue + due today + no date
      todo: sortPending(pending.filter((t) => !t.due_date || t.due_date <= today)),
      later: sortPending(pending.filter((t) => t.due_date && t.due_date > today)),
      doneToday: tasks
        .filter((t) => t.completed_at && toISODate(new Date(t.completed_at)) === today)
        .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at)),
    }
  }, [tasks])

  const pendingByRoom = useMemo(() => {
    const counts = {}
    for (const t of tasks ?? []) if (!t.completed_at) counts[t.room_id] = (counts[t.room_id] ?? 0) + 1
    return counts
  }, [tasks])

  // Updates from the API don't include the room name, so keep the old one.
  const replaceTask = (updated) =>
    setTasks((list) => list.map((t) => (t.id === updated.id ? { ...updated, room: t.room } : t)))

  async function handleToggle(task) {
    const wasDone = Boolean(task.completed_at)
    replaceTask({ ...task, completed_at: wasDone ? null : new Date().toISOString() })
    try {
      replaceTask(await setTaskDone(task.id, !wasDone))
      refreshStreak()
      listActivity({ limit: 5 }).then(setEvents).catch(() => {})
    } catch (err) {
      replaceTask(task)
      setError(err.message)
    }
  }

  async function handleAdd({ title, dueDate }) {
    const room = rooms.find((r) => r.id === selectedRoomId)
    const created = await createTask({ roomId: room.id, title, dueDate })
    setTasks((list) => [...list, { ...created, room: { id: room.id, name: room.name } }])
  }

  function handleRoomChange(id) {
    setComposerRoom(id)
    try {
      localStorage.setItem(LAST_ROOM_KEY, id)
    } catch {
      /* ignore */
    }
  }

  const firstName = profile.display_name.split(/\s+/)[0]
  const totalToday = todo.length + doneToday.length
  const progress = totalToday === 0 ? 0 : Math.round((doneToday.length / totalToday) * 100)

  if (error && !tasks) {
    return (
      <div className="space-y-3">
        <ErrorNote>{error}</ErrorNote>
        <button onClick={load} className="text-sm font-semibold text-brand">
          Try again
        </button>
      </div>
    )
  }
  if (!tasks || !rooms) return <Spinner />

  return (
    <div className="space-y-4">
      {/* Hero */}
      <section className="rounded-2xl bg-brand p-5 text-white">
        <p className="text-sm text-brand-soft">{greeting()},</p>
        <h1 className="mt-0.5 text-2xl font-bold">{firstName}</h1>
        {rooms.length > 0 && (
          <>
            <p className="mt-3 text-sm text-white/85">
              {totalToday === 0
                ? 'Nothing on your plate for today.'
                : todo.length === 0
                  ? `All ${doneToday.length} of today's tasks done 🎉`
                  : `${doneToday.length} of ${totalToday} done today`}
              {later.length > 0 && <span className="text-white/60"> · {later.length} coming up</span>}
            </p>
            {totalToday > 0 && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
            <StreakLine streak={streak} />
          </>
        )}
      </section>

      {error && <ErrorNote>{error}</ErrorNote>}

      {rooms.length > 0 && (
        <ReminderBanner enabled={profile.reminders_enabled} pendingToday={todo.length} streak={streak} />
      )}

      {rooms.length === 0 ? (
        <Card className="text-center">
          <p className="text-3xl" aria-hidden="true">👋</p>
          <h2 className="mt-2 font-semibold">Start with a room</h2>
          <p className="mt-1 text-sm text-muted">Tasks live inside rooms. Create one for your crew, or join a friend's.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link to="/rooms/new" className="rounded-xl bg-brand px-4 py-3 font-semibold text-white">
              Create room
            </Link>
            <Link to="/rooms/join" className="rounded-xl border border-line px-4 py-3 font-semibold">
              Join with code
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Today */}
          <Card className="!p-4">
            <h2 className="font-semibold">Today</h2>
            <div className="mt-3">
              <TaskComposer onAdd={handleAdd} rooms={rooms} roomId={selectedRoomId} onRoomChange={handleRoomChange} />
            </div>

            {todo.length === 0 && doneToday.length === 0 && (
              <p className="mt-3 text-sm text-muted">No tasks for today. Add one above, or enjoy the breather.</p>
            )}

            {todo.length > 0 && (
              <ul className="mt-2">
                {todo.map((t) => (
                  <TaskItem key={t.id} task={t} roomName={t.room?.name} editable onToggle={handleToggle} onOpen={setEditing} />
                ))}
              </ul>
            )}

            {doneToday.length > 0 && (
              <div className="mt-1 border-t border-line pt-2">
                <p className="py-1 text-sm font-semibold text-muted">Done today ({doneToday.length})</p>
                <ul>
                  {doneToday.map((t) => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      roomName={t.room?.name}
                      editable
                      onToggle={handleToggle}
                      onOpen={setEditing}
                      footer={<ReactionBar reactions={reactions[t.id]} meId={user.id} canReact={false} />}
                    />
                  ))}
                </ul>
              </div>
            )}

            {later.length > 0 && (
              <div className="mt-1 border-t border-line pt-2">
                <button
                  onClick={() => setShowLater((v) => !v)}
                  aria-expanded={showLater}
                  className="flex w-full items-center justify-between py-1 text-sm font-semibold text-muted hover:text-ink"
                >
                  <span>Coming up ({later.length})</span>
                  <span aria-hidden="true">{showLater ? '▾' : '▸'}</span>
                </button>
                {showLater && (
                  <ul>
                    {later.map((t) => (
                      <TaskItem key={t.id} task={t} roomName={t.room?.name} editable onToggle={handleToggle} onOpen={setEditing} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>

          {/* Rooms */}
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="font-semibold">Your rooms</h2>
              <Link to="/rooms" className="text-sm font-semibold text-brand">
                All
              </Link>
            </div>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {rooms.map((r) => (
                <Link
                  key={r.id}
                  to={`/rooms/${r.id}`}
                  className="w-40 shrink-0 rounded-2xl border border-line bg-surface p-3 transition hover:border-brand/40"
                >
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {r.memberCount} {r.memberCount === 1 ? 'member' : 'members'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {pendingByRoom[r.id] ? `${pendingByRoom[r.id]} pending for you` : 'All clear ✓'}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <InstallCard dismissible />

          {/* Recent activity */}
          {events && events.length > 0 && (
            <Card className="!py-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Recent activity</h2>
                <Link to="/activity" className="text-sm font-semibold text-brand">
                  See all
                </Link>
              </div>
              <ActivityList events={events} meId={user.id} showRoom />
            </Card>
          )}
        </>
      )}

      <TaskEditor
        task={editing}
        onClose={() => setEditing(null)}
        onSave={async (task, fields) => replaceTask(await updateTask(task.id, fields))}
        onDelete={async (task) => {
          await deleteTask(task.id)
          setTasks((list) => list.filter((t) => t.id !== task.id))
        }}
      />
    </div>
  )
}

function StreakLine({ streak }) {
  if (!streak) return null
  const { current_streak: current, best_streak: best, done_today: doneToday } = streak

  if (current === 0) {
    return (
      <p className="mt-3 text-xs text-white/70">
        Finish a task today to start a streak 🔥{best > 0 && <> · Best: {best} days</>}
      </p>
    )
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="rounded-full bg-white/15 px-2.5 py-1 text-sm font-bold">
        🔥 {current}-day streak
      </span>
      <span className="text-xs text-white/70">
        {doneToday ? 'Today counted ✓' : 'Finish a task today to keep it going'}
        {best > current && <> · Best: {best}</>}
      </span>
    </div>
  )
}
