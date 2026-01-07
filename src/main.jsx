import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'

// StrictMode reactivado con cleanup adecuado en los componentes
// Ahora los useEffect están preparados con AbortController para evitar peticiones duplicadas
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
