import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import ProcessPage from './pages/ProcessPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/webgpu-edge-detection/" element={<UploadPage />} />
        <Route path="/webgpu-edge-detection/process" element={<ProcessPage />} />
      </Routes>
    </Router>
  );
};

export default App;
