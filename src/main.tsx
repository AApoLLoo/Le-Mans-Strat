import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // Import du Router
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* On enveloppe l'application pour activer le routage */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)