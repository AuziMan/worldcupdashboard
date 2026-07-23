import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './providers/ThemeProvider.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import { SpoilerProvider } from './providers/SpoilerProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <SpoilerProvider>
        <App />
        <ScrollToTop />
      </SpoilerProvider>
    </ThemeProvider>
  </StrictMode>,
)
