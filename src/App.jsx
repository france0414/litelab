import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Cropper from './pages/Cropper.jsx';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cropper" element={<Cropper />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
