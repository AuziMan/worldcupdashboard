import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_BASE is set by the GitHub Actions deploy to "/<repo>/" so assets resolve
// under the project-pages subpath. Defaults to "/" for local dev.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
