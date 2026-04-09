/**
 * Application-wide Material UI theme configuration.
 * Formal, light theme with no emojis.
 */
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
 palette: {
  mode: "light",
  primary: {
   main: "#1a3a6b",
   light: "#2d5f9e",
   dark: "#0f2444",
   contrastText: "#ffffff",
  },
  secondary: {
   main: "#2e7d32",
   light: "#4caf50",
   dark: "#1b5e20",
   contrastText: "#ffffff",
  },
  background: {
   default: "#f4f6f8",
   paper: "#ffffff",
  },
  text: {
   primary: "#1a1a2e",
   secondary: "#4a5568",
  },
  divider: "#e2e8f0",
  error: { main: "#c62828" },
  warning: { main: "#e65100" },
  info: { main: "#01579b" },
  success: { main: "#2e7d32" },
 },
 typography: {
  fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
  h1: { fontWeight: 700, fontSize: "2rem", color: "#1a1a2e" },
  h2: { fontWeight: 700, fontSize: "1.75rem", color: "#1a1a2e" },
  h3: { fontWeight: 600, fontSize: "1.5rem", color: "#1a1a2e" },
  h4: { fontWeight: 600, fontSize: "1.25rem", color: "#1a1a2e" },
  h5: { fontWeight: 600, fontSize: "1.1rem", color: "#1a1a2e" },
  h6: { fontWeight: 600, fontSize: "1rem", color: "#1a1a2e" },
  body1: { fontSize: "0.9375rem", lineHeight: 1.6 },
  body2: { fontSize: "0.875rem", lineHeight: 1.5 },
  button: { textTransform: "none", fontWeight: 600 },
  caption: { fontSize: "0.78rem", color: "#4a5568" },
 },
 shape: {
  borderRadius: 6,
 },
 components: {
  MuiAppBar: {
   styleOverrides: {
    root: {
     boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
    },
   },
  },
  MuiButton: {
   styleOverrides: {
    root: {
     borderRadius: 4,
     padding: "8px 20px",
     fontSize: "0.875rem",
    },
    contained: {
     boxShadow: "none",
     "&:hover": { boxShadow: "0 2px 6px rgba(0,0,0,0.15)" },
    },
   },
  },
  MuiCard: {
   styleOverrides: {
    root: {
     boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
     border: "1px solid #e2e8f0",
    },
   },
  },
  MuiTableHead: {
   styleOverrides: {
    root: {
     "& .MuiTableCell-root": {
      backgroundColor: "#f0f4f8",
      fontWeight: 600,
      color: "#1a3a6b",
      fontSize: "0.8125rem",
      textTransform: "uppercase",
      letterSpacing: "0.04em",
     },
    },
   },
  },
  MuiTableCell: {
   styleOverrides: {
    root: {
     borderBottom: "1px solid #e2e8f0",
     padding: "10px 16px",
     fontSize: "0.875rem",
    },
   },
  },
  MuiChip: {
   styleOverrides: {
    root: {
     borderRadius: 4,
     fontWeight: 500,
     fontSize: "0.78rem",
    },
   },
  },
  MuiDrawer: {
   styleOverrides: {
    paper: {
     backgroundColor: "#1a3a6b",
     color: "#e8edf4",
    },
   },
  },
  MuiListItemButton: {
   styleOverrides: {
    root: {
     borderRadius: 4,
     margin: "2px 8px",
     "&.Mui-selected": {
      backgroundColor: "rgba(255,255,255,0.15)",
      "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
     },
     "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
    },
   },
  },
  MuiTextField: {
   defaultProps: { size: "small" },
  },
  MuiSelect: {
   defaultProps: { size: "small" },
  },
 },
});

export default theme;
