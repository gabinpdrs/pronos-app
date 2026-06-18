import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration minimale de Vite avec le plugin React
export default defineConfig({
  plugins: [react()],
})
