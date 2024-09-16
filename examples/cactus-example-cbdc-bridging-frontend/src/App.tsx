import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Helper from "./pages/Helper";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          <Route index element={<HomePage />} />
          <Route path="help" element={<Helper />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
