import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
  plugins: [
    react(),
    runtimeErrorOverlay({
      // Enhanced error overlay for local development
      position: "bottom-right"
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true, // ✅ CRITICAL FIX: Prevent port fallback, fail if 5173 is occupied
    host: "0.0.0.0", // Allow external access
    proxy: {
      // Proxy API requests to backend during development
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
      }
    },
    fs: {
      strict: false, // Allow serving files outside root for local development
      allow: [".."], // Allow access to parent directories
    },
    // Enable automatic browser opening
    open: true,
    // Hot reload configuration
    hmr: {
      port: 5174, // Use different port for HMR
      host: "localhost"
    }
  },
  // Enhanced development experience
  define: {
    __DEV__: true,
    __LOCAL__: true,
    'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
    'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
    'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
  },
  // Source maps for better debugging
  css: {
    devSourcemap: true
  },
  // Optimizations for local development
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query"],
    exclude: ["@vite/client", "@vite/env"]
  }
  };
});