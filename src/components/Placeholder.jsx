// Temporary card used by screens that get built in later phases.
export default function Placeholder({ title, phase, children }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-muted">Coming in Phase {phase}.</p>
      {children && <div className="mt-4">{children}</div>}
    </section>
  )
}
