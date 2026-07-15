import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so the built site works when served from a GitHub Pages
  // project subpath (https://<user>.github.io/<repo>/) as well as at root.
  base: './',
  server: { port: 5173, open: true },
})
