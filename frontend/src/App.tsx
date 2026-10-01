import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home/Home';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Reports } from './pages/Reports/Reports';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/indicadores" element={<Dashboard />} />
        <Route path="/relatorios" element={<Reports />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;