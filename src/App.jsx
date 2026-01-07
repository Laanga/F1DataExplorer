import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { YearProvider } from './contexts/YearContext';
import Navbar from './components/layout/Navbar';
import FondoAnimado from './components/ui/FondoAnimado';
import Loader from './components/ui/Loader';
import SeasonWarningPopup from './components/ui/SeasonWarningPopup';

// Lazy loading de páginas
const Inicio = lazy(() => import('./pages/Inicio'));
const Pilotos = lazy(() => import('./pages/Pilotos'));
const Equipos = lazy(() => import('./pages/Equipos'));
const Carreras = lazy(() => import('./pages/Carreras'));
const Estadisticas = lazy(() => import('./pages/Estadisticas'));

const AppContent = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <>
      {/* Popup de aviso de temporada */}
      <SeasonWarningPopup />
      
      {/* Fondo animado global */}
      <FondoAnimado />
      
      {/* Navbar fija */}
      <Navbar />
      
      {/* Contenedor principal - sin padding en home, con padding en otras páginas */}
      <main className={isHomePage ? '' : 'min-h-screen pt-20 pb-10'}>
        <Suspense fallback={
          <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
            <Loader mensaje="Cargando..." />
          </div>
        }>
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/pilotos" element={<Pilotos />} />
            <Route path="/equipos" element={<Equipos />} />
            <Route path="/carreras" element={<Carreras />} />
            <Route path="/estadisticas" element={<Estadisticas />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
};

const App = () => {
  return (
    <Router>
      <YearProvider>
        <AppContent />
        <Analytics />
      </YearProvider>
    </Router>
  );
};

export default App;
