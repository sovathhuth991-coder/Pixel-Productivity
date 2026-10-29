import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    // Split the big third-party libraries into their own long-cached chunks.
    // Firebase alone was ~400 KB of the original single bundle; keeping it
    // separate means a change to app code does not invalidate the vendor
    // chunk in the user's browser cache.
    //
    // The chart library matters most: it is only used by the Stats page, so
    // it must not end up in a chunk that the app shell pulls in on first
    // paint — a phone would download ~200 KB of charting code to render a
    // to-do list.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@firebase') || id.includes('/firebase/')) return 'firebase'
          if (
            id.includes('recharts') ||
            id.includes('/d3-') ||
            id.includes('/victory-vendor') ||
            id.includes('decimal.js') ||
            id.includes('fast-equals')
          )
            return 'charts'
          if (
            id.includes('framer-motion') ||
            id.includes('motion-dom') ||
            id.includes('motion-utils')
          )
            return 'motion'
          if (id.includes('@dnd-kit')) return 'dnd'
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler'))
            return 'react'
          return undefined
        },
      },
    },
    // Mobile networks are the constraint; warn earlier than the 500 KB default.
    chunkSizeWarningLimit: 400,
  },
});
