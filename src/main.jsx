import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyTheme, loadThemeId } from './themes'

// Тема — до первой отрисовки, иначе на секунду мелькнули бы чужие цвета
applyTheme(loadThemeId())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
