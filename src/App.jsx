import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Dashboard from './Dashboard';

function AppRoutes() {
  const navigate = useNavigate();

  const handleFilesSelected = (files) => {
    // Điều hướng đến dashboard và truyền danh sách file qua state
    navigate('/dashboard', { state: { initialFiles: files } });
  };

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <LandingPage 
            onFilesSelected={handleFilesSelected}
            onOpenSettings={() => navigate('/dashboard')} 
          />
        } 
      />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}