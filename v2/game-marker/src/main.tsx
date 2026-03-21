import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ProjectProvider } from './state/ProjectContext'
import { ToastProvider } from './components/Toast'
import { DialogProvider } from './components/Dialog'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProjectProvider>
        <ToastProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </ToastProvider>
      </ProjectProvider>
    </BrowserRouter>
  </StrictMode>,
)
