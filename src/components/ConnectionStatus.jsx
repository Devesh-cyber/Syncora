import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

// Phase 1 sanity check: confirms the env vars are set and the Supabase
// project is reachable. Remove once Phase 2 (auth) is working.
export default function ConnectionStatus() {
  const [state, setState] = useState(isSupabaseConfigured ? 'checking' : 'missing')
  const [detail, setDetail] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false
    supabase.auth
      .getSession()
      .then(({ error }) => {
        if (cancelled) return
        if (error) {
          setState('error')
          setDetail(error.message)
        } else {
          setState('ok')
        }
      })
      .catch((err) => {
        if (cancelled) return
        setState('error')
        setDetail(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const styles = {
    checking: 'border-line bg-surface text-muted',
    ok: 'border-done/30 bg-done/10 text-done',
    missing: 'border-warn/30 bg-warn/10 text-warn',
    error: 'border-danger/30 bg-danger/10 text-danger',
  }
  const text = {
    checking: 'Checking Supabase connection…',
    ok: 'Supabase connected',
    missing: 'Supabase not configured — copy .env.example to .env.local and add your keys',
    error: `Supabase error: ${detail}`,
  }

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${styles[state]}`}>
      {text[state]}
    </div>
  )
}
