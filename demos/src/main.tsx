import { createClient } from '@wa-dev/transparent-sdk-browser'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const client = createClient({
  apiUrl: 'http://localhost:3000/test',
  version: '',
  uid: '',
  pid: ''
})

client.start()
// console.log('client===', client)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
