import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Cropper from './pages/Cropper.jsx';

const RedirectHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get('redirect');
    if (!redirect) return;
    const target = `${redirect}${location.hash && !redirect.includes('#') ? location.hash : ''}`;
    navigate(target, { replace: true });
  }, [location.search, location.hash, navigate]);

  return null;
};

const App = () => {
  return (
    <>
      <RedirectHandler />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cropper" element={<Cropper />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
