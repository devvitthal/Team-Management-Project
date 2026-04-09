import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
 plugins: [react()],
 test: {
  globals: true,
  environment: "jsdom",
  setupFiles: "./src/test/setup.js",
  css: false,
  coverage: {
   reporter: ["text", "lcov"],
   include: ["src/**/*.{js,jsx}"],
   exclude: ["src/test/**", "src/main.jsx"],
  },
 },
 server: {
  port: 3000,
 },
 build: {
  chunkSizeWarningLimit: 1500,
  rollupOptions: {
   output: {
    manualChunks: {
     vendor: ["react", "react-dom", "react-router-dom"],
     mui: [
      "@mui/material",
      "@mui/icons-material",
      "@emotion/react",
      "@emotion/styled",
     ],
     charts: ["recharts"],
    },
   },
  },
 },
});
