import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import axios from 'axios'
import './App.css'
try {
  setTimeout(() => {
    throw new Error('自定义错误')
  }, 1000)
} catch (error) {
  console.log('catch---error', error)
}

// axios.post('http://localhost:3000/test', { hello: 'baby' })
//   .then(response => {
//     const date = response.headers.date;
//     console.log('date----------', date);
//   })
//   .catch(error => {
//     console.error(error);
//   });

// let type = window.navigator.connection.effectiveType;
// console.log('network----type', type, navigator.connection)
// function updateConnectionStatus() {
//   console.log(
//     `Connection type changed from ${type} to ${navigator.connection.effectiveType}`,
//   );
//   type = navigator.connection.effectiveType;
// }

// navigator.connection.addEventListener("change", updateConnectionStatus);

// navigator.connection.addEventListener('change', e => {
//   console.log('eeee', e)
// });

const sendByXHR = () => {
  return new Promise((resolve, reject) => {
    // const XMLHttpRequest = window.oXMLHttpRequest || window.XMLHttpRequest
    const xhr = new XMLHttpRequest()
    
    const onLoadFn = () => {
      xhr.removeEventListener('loadend', onLoadFn)
      // console.log('--sendByXHR--', data)
      // xhr 如果请求失败 status 的值是0
      if (xhr.status >= 400 || xhr.status === 0) {
        reject('')
      } else {
        resolve('')
      }
    }
    // text/plain;charset=UTF-8
    xhr.addEventListener('loadend', onLoadFn)
    xhr.open('POST', 'http://localhost:3000/test', true)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send(JSON.stringify({hello: 'baby'}))
  })
}
sendByXHR()

declare global {
  interface Navigator {
    connection: any
  }
}


function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
