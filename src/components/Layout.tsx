import type { ReactNode } from 'react'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <div className="global-nav">
        <span className="brand">Raspberry Pi Foundation</span>
      </div>
      <nav className="portal-nav">
        <div className="portal-logo">
          <span className="dot" />
          Code Club
        </div>
        <div className="nav-links">
          <span>Dashboard</span>
          <span>Clubs</span>
          <span className="active">Register a club</span>
          <span>Resources</span>
        </div>
      </nav>
      <main className="content">{children}</main>
      <footer className="footer">
        <span>© Raspberry Pi Foundation</span>
        <span>Privacy</span>
        <span>Terms</span>
        <span>Help</span>
      </footer>
    </div>
  )
}
