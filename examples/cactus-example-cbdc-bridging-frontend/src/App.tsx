import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import Helper from "./pages/Helper";
import "./App.css";

function App() {
  if (
    process.env.REACT_APP_BACKEND_PATH == undefined ||
    process.env.REACT_APP_BACKEND_PATH == ""
  ) {
    console.log("The BACKEND_PATH environment variable must be set.");
    throw new Error("The BACKEND_PATH environment variable must be set.");
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          <Route
            index
            element={<HomePage path={process.env.REACT_APP_BACKEND_PATH} />}
          />
          <Route path="help" element={<Helper />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
