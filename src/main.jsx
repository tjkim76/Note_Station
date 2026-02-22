import React from 'react'
import { createRoot } from 'react-dom/client'
import NoteApp from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const rootEl = document.getElementById('root')
const root = createRoot(rootEl)

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <NoteApp />
    </ErrorBoundary>
  </React.StrictMode>
)
