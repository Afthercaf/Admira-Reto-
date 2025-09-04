
import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/layout/Dashboard';

function App() {
  return (
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
  );
};

export default App;