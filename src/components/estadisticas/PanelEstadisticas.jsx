import { useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import gsap from 'gsap';

/**
 * Panel de estadística individual con efecto glass
 */
const PanelEstadisticas = ({ 
  titulo, 
  valor, 
  descripcion, 
  icono: Icon, 
  tendencia = null,
  delay = 0 
}) => {
  const containerRef = useRef(null);
  const valueRef = useRef(null);
  const iconRef = useRef(null);
  const barRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Container entrada
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, delay, ease: 'power2.out' }
      );

      // Valor con efecto scale
      if (valueRef.current) {
        gsap.fromTo(valueRef.current,
          { scale: 0 },
          { scale: 1, duration: 0.5, delay: delay + 0.2, ease: 'back.out(2)' }
        );
      }

      // Barra animada
      if (barRef.current) {
        gsap.fromTo(barRef.current,
          { width: 0 },
          { width: '100%', duration: 0.8, delay: delay + 0.3, ease: 'power2.out' }
        );
      }
    });

    return () => ctx.revert();
  }, [delay]);

  const handleHover = useCallback((isHovering) => {
    gsap.to(containerRef.current, {
      y: isHovering ? -4 : 0,
      scale: isHovering ? 1.02 : 1,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleIconHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      rotation: isHovering ? 10 : 0,
      scale: isHovering ? 1.1 : 1,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
      className="glass glass-hover rounded-2xl p-6 cursor-pointer"
      style={{ opacity: 0 }}
    >
      {/* Header con icono */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-white/60 text-sm font-medium mb-1">{titulo}</p>
          <h3
            ref={valueRef}
            className="text-4xl font-bold text-white"
            style={{ transform: 'scale(0)' }}
          >
            {valor}
          </h3>
        </div>

        {/* Icono */}
        {Icon && (
          <div
            ref={iconRef}
            onMouseEnter={(e) => handleIconHover(e, true)}
            onMouseLeave={(e) => handleIconHover(e, false)}
            className="w-12 h-12 rounded-xl bg-f1-red/20 flex items-center justify-center"
          >
            <Icon className="w-6 h-6 text-f1-red" />
          </div>
        )}
      </div>

      {/* Descripción y tendencia */}
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-xs">{descripcion}</p>
        
        {tendencia && (
          <div className={`
            flex items-center space-x-1 text-xs font-semibold
            ${tendencia === 'arriba' ? 'text-green-400' : 'text-red-400'}
          `}>
            {tendencia === 'arriba' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </div>
        )}
      </div>

      {/* Barra decorativa */}
      <div
        ref={barRef}
        className="h-1 bg-gradient-f1 rounded-full mt-4"
        style={{ width: 0 }}
      />
    </div>
  );
};

export default PanelEstadisticas;
