import { useState, useEffect, useRef, useCallback } from 'react';
import { X, AlertTriangle, Calendar, Info } from 'lucide-react';
import gsap from 'gsap';

/**
 * Popup de aviso sobre la temporada 2026
 * Se muestra una vez por sesión (o se puede configurar para localStorage)
 */
const SeasonWarningPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  
  const backdropRef = useRef(null);
  const modalRef = useRef(null);
  const iconRef = useRef(null);

  // Comprobar si debe mostrarse
  useEffect(() => {
    // Usar sessionStorage para mostrar solo una vez por sesión
    // Cambiar a localStorage si quieres que solo se muestre una vez en total
    const hasSeenWarning = sessionStorage.getItem('f1_season_warning_2026');
    
    if (!hasSeenWarning) {
      setShouldRender(true);
      // Pequeño delay para que la página cargue primero
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  // Animación de entrada
  useEffect(() => {
    if (!isVisible || !shouldRender || !backdropRef.current || !modalRef.current) return;

    const ctx = gsap.context(() => {
      // Backdrop fade in
      gsap.fromTo(backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );

      // Modal entrada
      gsap.fromTo(modalRef.current,
        { opacity: 0, scale: 0.8, y: 50 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)', delay: 0.1 }
      );

      // Icono pulso
      if (iconRef.current) {
        gsap.to(iconRef.current, {
          scale: 1.1,
          duration: 0.8,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut'
        });
      }
    });

    return () => ctx.revert();
  }, [isVisible, shouldRender]);

  // Cerrar popup
  const handleClose = useCallback(() => {
    if (!backdropRef.current || !modalRef.current) {
      setIsVisible(false);
      setShouldRender(false);
      sessionStorage.setItem('f1_season_warning_2026', 'true');
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setIsVisible(false);
        setShouldRender(false);
        sessionStorage.setItem('f1_season_warning_2026', 'true');
      }
    });

    tl.to(modalRef.current, {
      opacity: 0,
      scale: 0.8,
      y: 30,
      duration: 0.3,
      ease: 'power2.in'
    });

    tl.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in'
    }, '-=0.1');
  }, []);

  // Hover en botón
  const handleButtonHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.05 : 1,
      duration: 0.2,
      ease: 'power2.out'
    });
  }, []);

  if (!shouldRender) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4"
      style={{ opacity: 0 }}
      onClick={handleClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-3xl border border-yellow-500/30 shadow-2xl w-full max-w-lg overflow-hidden"
        style={{
          opacity: 0,
          background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(234, 179, 8, 0.15)'
        }}
      >
        {/* Header con gradiente */}
        <div className="relative p-6 pb-4 border-b border-yellow-500/20" style={{
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)'
        }}>
          {/* Botón cerrar */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>

          {/* Icono y título */}
          <div className="flex items-center space-x-4">
            <div
              ref={iconRef}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30"
            >
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Aviso Importante
              </h2>
              <p className="text-yellow-400/80 text-sm font-medium flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>Temporada 2026</span>
              </p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          <div className="flex items-start space-x-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-white/90 text-sm leading-relaxed">
              La <strong className="text-yellow-400">temporada 2026 de Fórmula 1</strong> aún no ha comenzado oficialmente. 
              Los datos mostrados pueden estar incompletos, desactualizados o corresponder a temporadas anteriores.
            </p>
          </div>

          <div className="space-y-3 text-white/70 text-sm">
            <p>
              📊 <strong className="text-white/90">Clasificaciones:</strong> Se mostrarán datos de la última temporada disponible hasta que comience la nueva.
            </p>
            <p>
              🏎️ <strong className="text-white/90">Pilotos y Equipos:</strong> La información puede no reflejar los cambios para 2026.
            </p>
            <p>
              📅 <strong className="text-white/90">Calendario:</strong> Las fechas se actualizarán cuando estén disponibles oficialmente.
            </p>
          </div>

          <div className="pt-2 text-center text-white/50 text-xs">
            Los datos se actualizarán automáticamente cuando comience la temporada oficial.
          </div>
        </div>

        {/* Footer con botón */}
        <div className="p-6 pt-2">
          <button
            onClick={handleClose}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-f1-red to-red-700 text-white font-bold text-lg shadow-lg shadow-f1-red/30 hover:shadow-f1-red/50 transition-shadow"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeasonWarningPopup;
