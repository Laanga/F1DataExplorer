import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Lenis from 'lenis';
import { YearProvider } from './contexts/YearContext';
import Navbar from './components/layout/Navbar';
import FondoAnimado from './components/ui/FondoAnimado';
import Loader from './components/ui/Loader';
import AppStartLoader from './components/ui/AppStartLoader';

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
      <FondoAnimado />
      <Navbar />
      <main className={isHomePage ? '' : 'min-h-screen pt-28 pb-10'}>
        <Suspense fallback={
          <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
            <Loader mensaje="Cargando…" />
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
  const [showStartLoader, setShowStartLoader] = useState(true);

  const handleStartComplete = useCallback(() => {
    setShowStartLoader(false);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      allowNestedScroll: true,
    });

    if (typeof window !== 'undefined') {
      window.__lenis = lenis;
    }

    return () => {
      if (typeof window !== 'undefined' && window.__lenis === lenis) {
        delete window.__lenis;
      }
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <div className={`app-boot-content ${showStartLoader ? 'is-preparing' : 'is-ready'}`}>
        <Router>
          <YearProvider>
            <AppContent />
            <Analytics />
          </YearProvider>
        </Router>
      </div>
      {showStartLoader && <AppStartLoader onComplete={handleStartComplete} />}
    </>
  );
};

export default App;
