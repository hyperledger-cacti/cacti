import HomePage from "./pages/HomePage";
import "./App.css";
import { ThemeProvider } from "@mui/styles";
import { createTheme } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";

const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HomePage />
    </ThemeProvider>
  );
}

export default App;
