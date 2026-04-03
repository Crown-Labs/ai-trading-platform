import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  envDir: path.resolve(__dirname, '../..'),
  plugins: [react()],
  resolve: {
    alias: {
      '@ai-trading/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: 'all',
    hmr: {
      clientPort: 443,
    },
  },
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.tsx?$/,
  },
})
