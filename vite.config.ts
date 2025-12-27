import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sitemap from "vite-plugin-sitemap"

export default defineConfig({
  base: '/', // 設置為根路徑，適用於GitHub Pages
  plugins: [
    react(),
    sitemap({
      hostname: 'https://learn.letsdoit.today',
      dynamicRoutes: [
        '/falling-ball/index.html',
        '/friction-inclined-plane/index.html',
        '/air-water-refraction/index.html',
        '/convex-lens/index.html',
        '/concave-lens/index.html',
        '/eye-simulation/index.html'
      ]
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-label', '@radix-ui/react-slider', '@radix-ui/react-slot'],
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority']
        }
      }
    }
  }
})