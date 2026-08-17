import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { DailyBonusProvider } from './contexts/DailyBonusContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <DailyBonusProvider>
            <App />
          </DailyBonusProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
