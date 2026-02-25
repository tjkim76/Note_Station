import React from 'react'
import { createRoot } from 'react-dom/client'
import NoteApp from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

const rootEl = document.getElementById('root')

if (rootEl) {
  const root = createRoot(rootEl)
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <NoteApp />
      </ErrorBoundary>
    </React.StrictMode>
  )
}
