import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Avatar from './Avatar.jsx'

const tabs = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/rooms', label: 'Rooms', icon: RoomsIcon },
  { to: '/activity', label: 'Activity', icon: ActivityIcon },
  { to: '/profile', label: 'Profile', icon: ProfileIcon },
]

export default function Layout() {
  const { profile } = useAuth()

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col">
      <header className="flex items-center gap-2 px-4 pt-5 pb-3">
        <img src="/icon.svg" alt="" className="h-8 w-8" />
        <span className="text-lg font-bold tracking-tight">Syncora</span>
        <Link to="/profile" className="ml-auto" aria-label="Your profile">
          <Avatar name={profile.display_name} url={profile.avatar_url} size={34} />
        </Link>
      </header>

      <main className="flex-1 px-4 pb-28">
        <Outlet />
      </main>

      {/* Bottom nav — mobile-first, stays usable on desktop */}
      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                    isActive ? 'text-brand' : 'text-muted hover:text-ink'
                  }`
                }
              >
                <Icon />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function svgProps() {
  return {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }
}
function HomeIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </svg>
  )
}
function RoomsIcon() {
  return (
    <svg {...svgProps()}>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5M15.5 14.6c2.6.1 4.6 1.9 5.2 4.9" />
    </svg>
  )
}
function ActivityIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  )
}
function ProfileIcon() {
  return (
    <svg {...svgProps()}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6" />
    </svg>
  )
}
