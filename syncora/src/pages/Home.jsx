import { useAuth } from '../context/AuthContext.jsx'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const { profile } = useAuth()
  const firstName = profile.display_name.split(/\s+/)[0]

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-brand p-5 text-white">
        <p className="text-sm text-brand-soft">{greeting()},</p>
        <h1 className="mt-0.5 text-2xl font-bold">{firstName}</h1>
        <p className="mt-3 text-sm text-white/80">
          Your tasks, streak and room shortcuts will live here (Phase 5).
        </p>
      </section>
    </div>
  )
}
