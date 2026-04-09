import { useState, type SVGAttributes } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useGSTStore } from '../../store/useGSTStore'
import { useTheme } from '../../hooks/useTheme'
import { pathnameToProgressStepId } from '../../lib/workflow'

const TAX_PERIODS = [
  'FY 2024–25',
  'FY 2025–26',
  'FY 2026–27',
  'Apr 2025 – Jun 2025',
  'Jul 2025 – Sep 2025',
  'Oct 2025 – Dec 2025',
  'Jan 2026 – Mar 2026',
] as const

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/upload', label: 'Upload', end: false },
  { to: '/match', label: 'Match Review', end: false },
  { to: '/report', label: 'Generate Report', end: false },
  { to: '/download', label: 'Download', end: false },
] as const

function SkydoMark(props: SVGAttributes<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <rect
        width="40"
        height="40"
        rx="10"
        className="fill-[var(--color-primary)]"
      />
      <path
        d="M27.5 9.5c-5.5-2.5-11.5 1-11 6.2.3 3.2 2.8 4.5 6.2 5.6 3.8 1.2 6.2 3 6.8 6.4.7 4-3.5 7.3-8.8 6.3-2.8-.5-5.1-1.9-6.2-4"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NavIcon({ to }: { to: string }) {
  const common = 'h-5 w-5 shrink-0 stroke-[1.75]'
  switch (to) {
    case '/':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
            stroke="currentColor"
            strokeLinejoin="round"
          />
        </svg>
      )
    case '/upload':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 16V4m0 0l4 4m-4-4L8 8M4 20h16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case '/match':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M8 12h8M12 8v8M6 18l-2 2M18 6l2-2M6 6L4 4M18 18l2 2"
            stroke="currentColor"
            strokeLinecap="round"
          />
        </svg>
      )
    case '/report':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M7 3v18M7 7h6l2 4 4 2v6H7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case '/download':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 4v12m0 0l4-4m-4 4L8 12M5 20h14"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    default:
      return null
  }
}

export function AppShell() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const taxPeriod = useGSTStore((s) => s.taxPeriod)
  const setTaxPeriod = useGSTStore((s) => s.setTaxPeriod)
  const currentStepId = pathnameToProgressStepId(location.pathname)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const periodOptions = Array.from(
    new Set(
      (TAX_PERIODS as readonly string[]).includes(taxPeriod)
        ? [...TAX_PERIODS]
        : [taxPeriod, ...TAX_PERIODS],
    ),
  )

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex min-h-dvh bg-[var(--color-bg-app)] text-[var(--color-text-primary)]">
      <a
        href="#main-content"
        className="fixed left-[var(--space-4)] top-[var(--space-4)] z-[100] -translate-y-[200%] rounded-[var(--radius-md)] bg-[var(--color-primary)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] font-medium text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2"
      >
        Skip to main content
      </a>
      <button
        type="button"
        className="fixed bottom-[var(--space-6)] right-[var(--space-6)] z-[calc(var(--z-sidebar)+1)] flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg md:hidden"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          {sidebarOpen ? (
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[var(--z-overlay)] bg-black/40 md:hidden"
          aria-label="Close menu overlay"
          onClick={closeSidebar}
        />
      ) : null}

      <aside
        id="app-sidebar"
        className={[
          'fixed inset-y-0 left-0 z-[var(--z-sidebar)] flex w-[var(--sidebar-width)] flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-sidebar)] shadow-lg transition-transform duration-200 md:static md:translate-x-0 md:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Primary navigation"
      >
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-[var(--space-5)] py-[var(--space-5)]">
          <SkydoMark className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-[length:var(--text-xs)] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Skydo
            </p>
            <p className="truncate text-[length:var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
              Compliance
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-[var(--space-3)] py-[var(--space-4)]">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={closeSidebar}
                  className={({ isActive }: { isActive: boolean }) =>
                    [
                      'flex items-center gap-3 rounded-[var(--radius-md)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] font-medium transition-colors',
                      isActive
                        ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]',
                    ].join(' ')
                  }
                >
                  <NavIcon to={item.to} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-4)] text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
          <p className="leading-snug">
            GST refund tools are for assistance only. Verify outputs with your CA
            before filing.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-[var(--z-topbar)] flex min-h-[var(--topbar-height)] flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-topbar)] px-[var(--space-4)] py-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between sm:px-[var(--space-6)] lg:px-[var(--space-8)]"
        >
          <div className="min-w-0">
            <h1 className="text-[length:var(--text-lg)] font-semibold tracking-tight text-[var(--color-text-primary)] md:text-[length:var(--text-xl)]">
              GST Refund Automation
            </h1>
            <p className="mt-0.5 text-[length:var(--text-xs)] text-[var(--color-text-muted)] md:hidden">
              Step: {currentStepId}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="tax-period-select"
                className="text-[length:var(--text-2xs)] font-medium uppercase tracking-wide text-[var(--color-text-muted)]"
              >
                Tax period
              </label>
              <select
                id="tax-period-select"
                value={taxPeriod}
                onChange={(e) => setTaxPeriod(e.target.value)}
                className="min-w-[11rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-primary)] shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                aria-describedby="tax-period-hint"
              >
                {periodOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <span id="tax-period-hint" className="sr-only">
                Select the financial year or quarter for this refund cycle.
              </span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] shadow-xs transition-colors hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              aria-label={
                theme === 'dark'
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
            >
              {theme === 'dark' ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M21 14.5A8.5 8.5 0 0111.5 3a8.5 8.5 0 109.5 11.5z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        <main
          id="main-content"
          className="flex-1 overflow-x-hidden overflow-y-auto px-[var(--space-4)] py-[var(--space-6)] sm:px-[var(--space-6)] lg:px-[var(--space-8)] lg:py-[var(--space-8)]"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
