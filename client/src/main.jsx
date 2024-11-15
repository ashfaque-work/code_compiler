import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import AssessmentList from "./AssessmentList.jsx"; // Add this import for the assessment list page
import Assessment from './Assessment.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/assessments" element={<AssessmentList />} /> {/* Index page for assessments */}
        <Route path="/assessment/:id" element={<Assessment />} /> {/* Dynamic route for individual assessments */}
      </Routes>
    </Router>
  </StrictMode>
);