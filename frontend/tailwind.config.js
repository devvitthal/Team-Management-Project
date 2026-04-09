/** @type {import('tailwindcss').Config} */
export default {
 corePlugins: {
  preflight: false,
 },
 content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
 theme: {
  extend: {
   colors: {
    navy: {
     50: "#eef2f7",
     100: "#d5e0ef",
     200: "#abbfdf",
     300: "#7d9ace",
     400: "#5a7bb8",
     500: "#3d5d9e",
     600: "#2d4a82",
     700: "#1a3a6b",
     800: "#122752",
     900: "#0a1829",
    },
   },
  },
 },
 plugins: [],
};
