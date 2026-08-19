import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so the built site works when served from a GitHub Pages
  // project subpath (https://<user>.github.io/<repo>/) as well as at root.
  base: './',
  // PORT lets a harness assign a free port when 5173 is already taken; plain
  // `npm run dev` still comes up on 5173.
  server: { port: Number(process.env.PORT) || 5173, open: true },
})
