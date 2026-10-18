import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n/i18n'  // Initialize i18n translations
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { DailyBonusProvider } from './contexts/DailyBonusContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { LegalModalProvider } from './contexts/LegalModalContext'
import { CookieConsentProvider } from './contexts/CookieConsentContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CookieConsentProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <DailyBonusProvider>
                <LegalModalProvider>
                  <App />
                </LegalModalProvider>
              </DailyBonusProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </CookieConsentProvider>
    </BrowserRouter>
  </StrictMode>
)
