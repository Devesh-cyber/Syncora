import { useCallback, useEffect, useMemo, useState } from 'react'
import Avatar from '../Avatar.jsx'
import { Card, ErrorNote, Spinner } from '../ui.jsx'
import TaskItem from './TaskItem.jsx'
import TaskComposer from './TaskComposer.jsx'
import TaskEditor from './TaskEditor.jsx'
import ReactionBar from './ReactionBar.jsx'
import {
  createTask,
  deleteTask,
  listRoomTasks,
  setTaskDone,
  sortCompleted,
  sortPending,
  updateTask,
} from '../../lib/tasks.js'
import { addReaction, groupReactions, listRoomReactions, removeReaction } from '../../lib/reactions.js'
import { getRoomStreaks } from '../../lib/streaks.js'

// All tasks in a room, grouped by member. You're always first.
// onChange: called after a change that affects the activity feed.
// liveKey: bumped by the room page when realtime says something changed.
export default function RoomTasks({ room, currentUserId, liveKey = 0, onChange = () => {} }) {
  const [tasks, setTasks] = useState(null)
  const [reactions, setReactions] = useState([]) // [{ task_id, user_id, emoji }]
  const [streaks, setStreaks] = useState({})
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)

  const refreshStreaks = useCallback(() => {
    getRoomStreaks(room.id)
      .then(setStreaks)
      .catch(() => {})
  }, [room.id])

  const load = useCallback(async () => {
    try {
      setError(null)
      const [t, r] = await Promise.all([listRoomTasks(room.id), listRoomReactions(room.id)])
      setTasks(t)
      setReactions(r)
      refreshStreaks()
    } catch (err) {
      setError(err.message)
    }
  }, [room.id, refreshStreaks])

  useEffect(() => {
    load()
  }, [load, liveKey])

  const names = useMemo(() => Object.fromEntries(room.members.map((m) => [m.id, m.display_name])), [room.members])
  const reactionsByTask = useMemo(() => groupReactions(reactions), [reactions])

  // Members in display order: you first, then the room's member order.
  const groups = useMemo(() => {
    if (!tasks) return []
    const me = room.members.find((m) => m.id === currentUserId)
    const others = room.members.filter((m) => m.id !== currentUserId)
    return [me, ...others].filter(Boolean).map((member) => {
      const mine = tasks.filter((t) => t.owner_id === member.id)
      return {
        member,
        pending: sortPending(mine.filter((t) => !t.completed_at)),
        completed: sortCompleted(mine.filter((t) => t.completed_at)),
      }
    })
  }, [tasks, room.members, currentUserId])

  const replaceTask = (updated) => setTasks((list) => list.map((t) => (t.id === updated.id ? updated : t)))

  async function handleAdd({ title, dueDate }) {
    const created = await createTask({ roomId: room.id, title, dueDate })
    setTasks((list) => [...list, created])
  }

  // Optimistic: flip it instantly, roll back if the server says no.
  async function handleToggle(task) {
    const wasDone = Boolean(task.completed_at)
    replaceTask({ ...task, completed_at: wasDone ? null : new Date().toISOString() })
    try {
      replaceTask(await setTaskDone(task.id, !wasDone))
      // Unchecking wipes the task's reactions on the server; mirror it here.
      if (wasDone) setReactions((list) => list.filter((r) => r.task_id !== task.id))
      refreshStreaks()
      onChange()
    } catch (err) {
      replaceTask(task)
      setError(err.message)
    }
  }

  async function handleReact(task, emoji, mine) {
    const row = { task_id: task.id, user_id: currentUserId, emoji }
    const isRow = (r) => r.task_id === task.id && r.user_id === currentUserId && r.emoji === emoji
    setReactions((list) => (mine ? list.filter((r) => !isRow(r)) : [...list, row]))
    try {
      if (mine) await removeReaction(task.id, currentUserId, emoji)
      else await addReaction(task.id, emoji)
      onChange()
    } catch (err) {
      setReactions((list) => (mine ? [...list, row] : list.filter((r) => !isRow(r))))
      setError(err.message)
    }
  }

  async function handleSave(task, fields) {
    replaceTask(await updateTask(task.id, fields))
  }

  async function handleDelete(task) {
    await deleteTask(task.id)
    setTasks((list) => list.filter((t) => t.id !== task.id))
    setReactions((list) => list.filter((r) => r.task_id !== task.id))
    if (task.completed_at) {
      refreshStreaks()
      onChange()
    }
  }

  if (!tasks && !error) return <Spinner />

  const footerFor = (task, isMe) =>
    task.completed_at ? (
      <ReactionBar
        reactions={reactionsByTask[task.id]}
        meId={currentUserId}
        names={names}
        canReact={!isMe}
        onToggle={(emoji, mine) => handleReact(task, emoji, mine)}
      />
    ) : null

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ErrorNote>{error}</ErrorNote>
          </div>
          <button onClick={load} className="text-sm font-semibold text-brand">
            Retry
          </button>
        </div>
      )}

      {groups.map(({ member, pending, completed }) => (
        <MemberTasks
          key={member.id}
          member={member}
          isMe={member.id === currentUserId}
          streak={streaks[member.id]}
          pending={pending}
          completed={completed}
          footerFor={footerFor}
          onAdd={handleAdd}
          onToggle={handleToggle}
          onOpen={setEditing}
        />
      ))}

      <TaskEditor task={editing} onClose={() => setEditing(null)} onSave={handleSave} onDelete={handleDelete} />
    </div>
  )
}

function MemberTasks({ member, isMe, streak, pending, completed, footerFor, onAdd, onToggle, onOpen }) {
  const [showDone, setShowDone] = useState(completed.length > 0 && completed.length <= 3)
  const total = pending.length + completed.length
  const current = streak?.current_streak ?? 0

  return (
    <Card className="!p-4">
      <div className="flex items-center gap-3">
        <Avatar name={member.display_name} url={member.avatar_url} size={32} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{isMe ? 'Your tasks' : member.display_name}</h3>
          <p className="text-xs font-medium text-muted">
            {pending.length} pending · {completed.length} done
          </p>
        </div>
        {current > 0 && (
          <span
            className="shrink-0 rounded-full bg-warn/10 px-2 py-1 text-xs font-bold text-warn"
            title={`${current}-day streak${streak.done_today ? '' : ' — nothing done yet today'}`}
          >
            🔥 {current}
          </span>
        )}
      </div>

      {isMe && (
        <div className="mt-3">
          <TaskComposer onAdd={onAdd} />
        </div>
      )}

      {total === 0 && (
        <p className="mt-3 text-sm text-muted">{isMe ? 'Nothing here yet — add your first task above.' : 'No tasks yet.'}</p>
      )}

      {pending.length > 0 && (
        <ul className="mt-2">
          {pending.map((t) => (
            <TaskItem key={t.id} task={t} editable={isMe} onToggle={onToggle} onOpen={onOpen} />
          ))}
        </ul>
      )}

      {completed.length > 0 && (
        <div className="mt-1 border-t border-line pt-2">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex w-full items-center justify-between py-1 text-sm font-semibold text-muted hover:text-ink"
            aria-expanded={showDone}
          >
            <span>Completed ({completed.length})</span>
            <span aria-hidden="true">{showDone ? '▾' : '▸'}</span>
          </button>
          {showDone && (
            <ul>
              {completed.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  editable={isMe}
                  onToggle={onToggle}
                  onOpen={onOpen}
                  footer={footerFor(t, isMe)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}
