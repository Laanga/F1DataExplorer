import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Componente de carga con animación estilo F1
 * Muestra un indicador giratorio con efecto glass
 */
const Loader = ({ mensaje = 'Cargando datos…' }) => {
  const outerRingRef = useRef(null);
  const innerRingRef = useRef(null);
  const centerDotRef = useRef(null);
  const messageRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Círculo exterior - rotación
      if (outerRingRef.current) {
        gsap.to(outerRingRef.current, {
          rotation: 360,
          duration: 1.5,
          repeat: -1,
          ease: 'none'
        });
      }

      // Círculo interior - rotación inversa
      if (innerRingRef.current) {
        gsap.to(innerRingRef.current, {
          rotation: -360,
          duration: 1,
          repeat: -1,
          ease: 'none'
        });
      }

      // Punto central - pulso
      if (centerDotRef.current) {
        gsap.to(centerDotRef.current, {
          scale: 1.2,
          opacity: 1,
          duration: 0.75,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut'
        });
      }

      // Mensaje - fade
      if (messageRef.current) {
        gsap.to(messageRef.current, {
          opacity: 1,
          duration: 1,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut'
        });
      }

      // Barra de progreso - sweep
      if (progressRef.current) {
        gsap.to(progressRef.current, {
          x: '300%',
          duration: 1.5,
          repeat: -1,
          ease: 'power1.inOut'
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
      <div className="relative border border-f1-copper/20 bg-black/25 p-8" style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))' }}>
        <div
          ref={outerRingRef}
          className="w-20 h-20 rounded-full border-4 border-white/10 border-t-f1-copper"
        />
        <div
          ref={innerRingRef}
          className="absolute inset-2 w-16 h-16 rounded-full border-4 border-white/5 border-b-f1-red"
        />
        <div
          ref={centerDotRef}
          className="absolute inset-0 m-auto w-3 h-3 bg-f1-red rounded-full shadow-lg shadow-f1-red/50"
          style={{ opacity: 0.5 }}
        />
      </div>

      <p
        ref={messageRef}
        className="data-label text-white/70"
        style={{ opacity: 0.5 }}
      >
        {mensaje}
      </p>

      <div className="w-56 h-1 bg-white/10 overflow-hidden border border-white/10">
        <div
          ref={progressRef}
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-f1-red to-transparent"
          style={{ transform: 'translateX(-100%)' }}
        />
      </div>
    </div>
  );
};

export default Loader;
