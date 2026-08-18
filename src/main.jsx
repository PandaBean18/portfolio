import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'
import SirPixelotArticle from './components/SirPixelotArticle.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/sir-pixelot" element={<SirPixelotArticle />} />
      </Routes>
    </BrowserRouter>
    <Analytics />
  </StrictMode>,
)
