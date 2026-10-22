import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import ProfileForm from '../components/ProfileForm.jsx'

export default function Profile() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h1 className="mb-5 text-xl font-bold">Profile</h1>
        <ProfileForm
          userId={user.id}
          initialName={profile.display_name}
          initialAvatar={profile.avatar_url}
          submitLabel="Save changes"
          requireChange
          onSubmit={updateProfile}
        />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted">Signed in as</span>
          <span className="truncate font-medium">{user.email}</span>
        </div>
        <div className="mt-2 flex justify-between gap-4">
          <span className="text-muted">Time zone</span>
          <span className="font-medium">{profile.timezone}</span>
        </div>
      </section>

      <button
        onClick={async () => {
          setSigningOut(true)
          await signOut()
        }}
        disabled={signingOut}
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 font-semibold text-danger disabled:opacity-60"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  )
}
