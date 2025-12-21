import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sitemap from "vite-plugin-sitemap"

export default defineConfig({
  plugins: [
    react(),
    sitemap({
      hostname: 'https://learn.letsdoit.today',
      dynamicRoutes: [
        '/falling-ball',
        '/friction-inclined-plane',
        '/air-water-refraction',
        '/convex-lens',
        '/concave-lens',
      ]
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})