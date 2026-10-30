import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { applyTheme, DEFAULT_PREFS } from './store/ui-slice'
import { loadPrefs } from './utils/storage'

document.documentElement.lang = 'en';
document.title = 'NetLab Studio';
applyTheme(loadPrefs(DEFAULT_PREFS).theme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
