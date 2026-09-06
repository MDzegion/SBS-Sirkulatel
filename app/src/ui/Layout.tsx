import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/simulator', label: 'Simulator', accent: true },
  { to: '/kasir', label: 'Kasir' },
  { to: '/dapur', label: 'Dapur' },
  { to: '/bahan', label: 'Bahan' },
  { to: '/laporan', label: 'Laporan' },
]

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-bg font-sans text-text-body">
      <header className="sticky top-0 z-10 border-b border-border-default bg-surface-card">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-text-title">SBS Sirkulatel</h1>
              <p className="text-xs text-text-muted">Catat harian, uji keputusan sebelum eksekusi</p>
            </div>
            <span className="hidden rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 sm:block">
              Offline-first
            </span>
          </div>
          <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : item.accent
                        ? 'text-accent-600 hover:bg-accent-50'
                        : 'text-text-muted hover:bg-surface-card-subtle hover:text-text-body'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-border-default bg-surface-card py-3 text-center text-xs text-text-muted">
        Data tersimpan lokal di perangkat Anda
      </footer>
    </div>
  )
}
