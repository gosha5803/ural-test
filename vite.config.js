import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const REQUIRED_ENV = ['VITE_API_URL', 'VITE_API_KEY']

export default defineConfig(({ mode }) => {
  // .env, .env.local, .env.[mode] + process.env с префиксом VITE_
  const env = loadEnv(mode, process.cwd())

  const missing = REQUIRED_ENV.filter((key) => !env[key])
  if (missing.length) {
    throw new Error(`Не заданы переменные окружения: ${missing.join(', ')} (см. .env.example)`)
  }

  return {
    plugins: [react()],
  }
})
