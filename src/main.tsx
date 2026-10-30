import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { getSavedLocale, getTranslations } from './i18n'

const initialLocale = getSavedLocale();
document.documentElement.lang = initialLocale;
document.title = getTranslations(initialLocale)['app.title'];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
