import { BrowserRouter, Route, Routes } from "react-router";
import { Playground } from "./pages/Playground.js";
import { ProblemList } from "./pages/ProblemList.js";
import { ProblemPage } from "./pages/ProblemPage.js";
import { NotFound } from "./pages/NotFound.js";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Playground />} />
        <Route path="/problems" element={<ProblemList />} />
        <Route path="/problems/:slug" element={<ProblemPage />} />
        {/* The original had no catch-all, so a bad URL rendered nothing. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
