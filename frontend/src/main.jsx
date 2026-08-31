import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './providers/ThemeProvider.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import { SpoilerProvider } from './providers/SpoilerProvider.jsx'
import { FavoritesProvider } from './providers/FavoritesProvider.jsx'
import { TooltipProvider } from './components/ui/Tooltip.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <SpoilerProvider>
        <FavoritesProvider>
          <TooltipProvider delay={500} closeDelay={80} timeout={350}>
            <App />
            <ScrollToTop />
          </TooltipProvider>
        </FavoritesProvider>
      </SpoilerProvider>
    </ThemeProvider>
  </StrictMode>,
)
