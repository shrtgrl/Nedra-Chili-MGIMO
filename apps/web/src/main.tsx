import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/manrope/cyrillic-400.css'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/cyrillic-500.css'
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/cyrillic-600.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/cyrillic-700.css'
import '@fontsource/manrope/latin-700.css'
import '@fontsource/unbounded/cyrillic-700.css'
import '@fontsource/unbounded/latin-700.css'
import '@fontsource/unbounded/cyrillic-800.css'
import '@fontsource/unbounded/latin-800.css'
import './styles/tokens.css'
import './styles/global.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
