import { ThemeOptions } from "@mui/material/styles";

/**
 * Hyperledger Cacti Design System: MUI theme mapping
 * Derived from PR #4746 / docs/docs/stylesheets/cacti-tokens.css.
 */
export const themeOptions: ThemeOptions = {
  palette: {
    mode: "light",
    primary: {
      main: "#4e8c5e", // --cacti-green-700 (primary action & brand)
      light: "#7fbf8a", // --cacti-green-500
      dark: "#2c5238", // --cacti-green-900
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#ef9a4f", // --cacti-bloom-500 (warm bloom accent - used sparingly)
      light: "#f7c395", // --cacti-bloom-300
      dark: "#c2762f", // --cacti-bloom-700
      contrastText: "#101314",
    },
    warning: {
      main: "#c2762f", // --cacti-bloom-700
      light: "#f7c395",
      dark: "#9c571e",
      contrastText: "#ffffff",
    },
    error: {
      main: "#c04a3d", // --danger
      light: "#e57373",
      dark: "#9a2e23",
      contrastText: "#ffffff",
    },
    success: {
      main: "#4e8c5e", // --success / --cacti-green-700
      light: "#7fbf8a",
      dark: "#2c5238",
      contrastText: "#ffffff",
    },
    info: {
      main: "#3b4548", // --cacti-ink-500
      light: "#8d9a9d",
      dark: "#1c2224",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f7f9f6", // --cacti-paper
      paper: "#ffffff", // --surface
    },
    text: {
      primary: "#101314", // --cacti-ink-900
      secondary: "#3b4548", // --cacti-ink-500
      disabled: "#8d9a9d", // --cacti-ink-300
    },
    divider: "#dfe5e3", // --cacti-ink-100
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    h1: {
      fontFamily: '"Barlow", Arial, sans-serif',
      fontWeight: 700,
      color: "#101314",
    },
    h2: {
      fontFamily: '"Barlow", Arial, sans-serif',
      fontWeight: 700,
      color: "#101314",
    },
    h3: {
      fontFamily: '"Barlow", Arial, sans-serif',
      fontWeight: 600,
      color: "#101314",
    },
    h4: {
      fontFamily: '"Barlow", Arial, sans-serif',
      fontWeight: 600,
      color: "#101314",
    },
    h5: {
      fontFamily: '"Barlow", Arial, sans-serif',
      fontWeight: 600,
      color: "#101314",
    },
    h6: {
      fontFamily: '"Barlow", Arial, sans-serif',
      fontWeight: 600,
      color: "#101314",
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8, // --radius-md (8px)
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 1px 2px rgba(16, 19, 20, 0.08)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: "1px solid #dfe5e3",
          boxShadow: "0 1px 2px rgba(16, 19, 20, 0.08)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "0 1px 2px rgba(16, 19, 20, 0.08)",
        },
      },
    },
  },
};
