import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  deleteRoom,
  formatCode,
  getRoom,
  joinLink,
  leaveRoom,
  MAX_ROOM_DESCRIPTION,
  MAX_ROOM_NAME,
  regenerateJoinCode,
  removeMember,
  updateRoom,
} from '../lib/rooms.js'
import Avatar from '../components/Avatar.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import {
  BackLink,
  Badge,
  Card,
  ErrorNote,
  PrimaryButton,
  SecondaryButton,
  Spinner,
  TextArea,
  TextField,
} from '../components/ui.jsx'

export default function RoomDetail() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [room, setRoom] = useState(undefined) // undefined = loading, null = not found
  const [error, setError] = useState(null)
  const [dialog, setDialog] = useState(null) // { title, body, confirmLabel, danger, onConfirm }

  const load = useCallback(async () => {
    try {
      setError(null)
      setRoom(await getRoom(roomId))
    } catch (err) {
      setError(err.message)
    }
  }, [roomId])

  useEffect(() => {
    load()
  }, [load])

  if (error && room === undefined) {
    return (
      <div className="space-y-4">
        <BackLink to="/rooms">Rooms</BackLink>
        <ErrorNote>{error}</ErrorNote>
      </div>
    )
  }
  if (room === undefined) return <Spinner />
  if (room === null) {
    return (
      <div className="space-y-4">
        <BackLink to="/rooms">Rooms</BackLink>
        <Card className="text-center">
          <h1 className="font-semibold">Room not found</h1>
          <p className="mt-1 text-sm text-muted">It may have been deleted, or you're no longer a member.</p>
        </Card>
      </div>
    )
  }

  const isAdmin = room.admin_id === user.id
  const memberCount = room.members.length

  const askRemove = (member) =>
    setDialog({
      title: `Remove ${member.display_name}?`,
      body: 'They lose access to this room, and their tasks in it are deleted. They can rejoin with the code.',
      confirmLabel: 'Remove',
      danger: true,
      onConfirm: async () => {
        await removeMember(room.id, member.id)
        await load()
      },
    })

  const askRegenerate = () =>
    setDialog({
      title: 'Make a new code?',
      body: "The current code stops working right away. People already in the room aren't affected.",
      confirmLabel: 'New code',
      onConfirm: async () => {
        const code = await regenerateJoinCode(room.id)
        setRoom((r) => ({ ...r, join_code: code }))
      },
    })

  const askLeave = () =>
    setDialog({
      title: `Leave ${room.name}?`,
      body: 'Your tasks in this room will be deleted. You can rejoin later with the code.',
      confirmLabel: 'Leave room',
      danger: true,
      onConfirm: async () => {
        await leaveRoom(room.id)
        navigate('/rooms', { replace: true })
      },
    })

  const askDelete = () =>
    setDialog({
      title: `Delete ${room.name}?`,
      body: 'This permanently deletes the room and everything in it. This can’t be undone.',
      confirmLabel: 'Delete room',
      danger: true,
      onConfirm: async () => {
        await deleteRoom(room.id)
        navigate('/rooms', { replace: true })
      },
    })

  return (
    <div className="space-y-4">
      <BackLink to="/rooms">Rooms</BackLink>

      <RoomHeader room={room} isAdmin={isAdmin} memberCount={memberCount} onSaved={load} />

      <InviteCard code={room.join_code} roomName={room.name} isAdmin={isAdmin} onRegenerate={askRegenerate} />

      <Card>
        <h2 className="font-semibold">Members</h2>
        <ul className="mt-3 divide-y divide-line">
          {room.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <Avatar name={m.display_name} url={m.avatar_url} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">
                    {m.display_name}
                    {m.id === user.id && <span className="font-normal text-muted"> (you)</span>}
                  </span>
                  {m.id === room.admin_id && <Badge>Admin</Badge>}
                </div>
                <p className="text-xs text-muted">
                  Joined {new Date(m.joinedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </p>
              </div>
              {isAdmin && m.id !== user.id && (
                <button
                  onClick={() => askRemove(m)}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:text-danger"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="text-center">
        <p className="text-sm text-muted">Everyone's tasks will show up here in Phase 4.</p>
      </Card>

      <div className="pt-2">
        {isAdmin ? (
          memberCount === 1 ? (
            <SecondaryButton onClick={askDelete} className="w-full text-danger">
              Delete room
            </SecondaryButton>
          ) : (
            <p className="text-center text-xs text-muted">
              Deleting a room with other members needs a vote — coming in Phase 7.
            </p>
          )
        ) : (
          <SecondaryButton onClick={askLeave} className="w-full text-danger">
            Leave room
          </SecondaryButton>
        )}
      </div>

      <ConfirmDialog open={Boolean(dialog)} {...dialog} onClose={() => setDialog(null)} />
    </div>
  )
}

function RoomHeader({ room, isAdmin, memberCount, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(room.name)
  const [description, setDescription] = useState(room.description ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function startEdit() {
    setName(room.name)
    setDescription(room.description ?? '')
    setError(null)
    setEditing(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return setError('The room needs a name.')
    setBusy(true)
    setError(null)
    try {
      await updateRoom(room.id, { name: name.trim(), description: description.trim() || null })
      await onSaved()
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <TextField label="Room name" value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_ROOM_NAME} />
          <TextArea
            label="What's it for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={MAX_ROOM_DESCRIPTION}
            rows={3}
            hint={`${description.length}/${MAX_ROOM_DESCRIPTION}`}
          />
          <ErrorNote>{error}</ErrorNote>
          <div className="flex gap-3">
            <SecondaryButton type="button" onClick={() => setEditing(false)} disabled={busy} className="flex-1">
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={busy} className="flex-1">
              {busy ? 'Saving…' : 'Save'}
            </PrimaryButton>
          </div>
        </form>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold break-words">{room.name}</h1>
          {room.description && <p className="mt-1 text-sm text-muted break-words">{room.description}</p>}
          <p className="mt-2 text-xs font-medium text-muted">
            {memberCount} of 20 members
          </p>
        </div>
        {isAdmin && (
          <button onClick={startEdit} className="rounded-lg px-2 py-1 text-sm font-semibold text-brand">
            Edit
          </button>
        )}
      </div>
    </Card>
  )
}

function InviteCard({ code, roomName, isAdmin, onRegenerate }) {
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && Boolean(navigator.share)

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatCode(code))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked — the code is visible anyway */
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: `Join ${roomName} on Syncora`,
        text: `Join "${roomName}" on Syncora with code ${formatCode(code)}`,
        url: joinLink(code),
      })
    } catch {
      /* user cancelled */
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Room code</h2>
        {isAdmin && (
          <button onClick={onRegenerate} className="text-sm font-semibold text-muted hover:text-ink">
            New code
          </button>
        )}
      </div>
      <p className="mt-3 text-center font-mono text-3xl font-semibold tracking-[0.2em] select-all">{formatCode(code)}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <SecondaryButton onClick={copy} className={canShare ? '' : 'col-span-2'}>
          {copied ? 'Copied ✓' : 'Copy code'}
        </SecondaryButton>
        {canShare && <PrimaryButton onClick={share}>Share</PrimaryButton>}
      </div>
    </Card>
  )
}
