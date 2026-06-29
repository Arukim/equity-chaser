import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// `import.meta.env.BASE_URL` resolves to '/' in dev and '/equity-chaser/' in
// the production build (set by vite.config.ts `base`). Passing it as `basename`
// ensures all NavLinks and Route paths are correctly prefixed on GitHub Pages.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
