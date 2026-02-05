import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // @ts-ignore vitest/config
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setupTests.ts'],
  },
})
