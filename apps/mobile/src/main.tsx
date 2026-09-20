import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initDB } from './db/connection'

// Initialize SQLite before rendering
initDB().then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}).catch(err => {
  console.error('Failed to initialize App', err)
  document.body.innerHTML = '<h1>Critical Error: Failed to initialize database</h1>'
})
