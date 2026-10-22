import ConnectionStatus from '../components/ConnectionStatus.jsx'

export default function Home() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-brand p-5 text-white">
        <p className="text-sm text-brand-soft">Your goals, your crew, your progress.</p>
        <h1 className="mt-1 text-2xl font-bold">Today</h1>
        <p className="mt-3 text-sm text-white/80">
          Your tasks, streak and room shortcuts will live here (Phase 5).
        </p>
      </section>

      <ConnectionStatus />
    </div>
  )
}
