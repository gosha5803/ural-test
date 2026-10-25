import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'bootstrap/dist/css/bootstrap.min.css'
import { store } from './store'
import App from './App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Не найден элемент #root')
}

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
