import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import './index.css'
import App from './App.tsx'

function syncThemeBeforePaint() {
  const key = 'skydo-gst-theme'
  const stored = localStorage.getItem(key)
  const mode =
    stored === 'dark' || stored === 'light'
      ? stored
      : typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
  document.documentElement.setAttribute('data-theme', mode)
}

syncThemeBeforePaint()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
