// Phase 2 replaces the disabled button with real Google sign-in.
export default function SignIn() {
  return (
    <div className="flex min-h-full items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <img src="/icon.svg" alt="" className="mx-auto h-16 w-16" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Syncora</h1>
        <p className="mt-2 text-muted">Your goals, your crew, your progress.</p>
        <button
          disabled
          className="mt-8 w-full rounded-xl border border-line bg-surface px-4 py-3 font-semibold text-muted"
        >
          Continue with Google (Phase 2)
        </button>
      </div>
    </div>
  )
}
