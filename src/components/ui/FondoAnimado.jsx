import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Componente de fondo animado con efecto de partículas y gradientes
 * Crea una atmósfera "liquid glass" sutil
 */
const FondoAnimado = () => {
  const gradientRef = useRef(null);
  const particlesRef = useRef([]);

  // Generamos partículas decorativas
  const particulas = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 100 + 50,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
  }));

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animación del gradiente
      if (gradientRef.current) {
        gsap.to(gradientRef.current, {
          opacity: 0.2,
          scale: 1.1,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut'
        });
      }

      // Animación de partículas
      particlesRef.current.forEach((particle, index) => {
        if (!particle) return;
        const data = particulas[index];
        
        gsap.fromTo(particle,
          {
            y: `${data.y}vh`,
            scale: 0,
            opacity: 0
          },
          {
            y: `${data.y - 20}vh`,
            scale: 1,
            opacity: 0.15,
            duration: data.duration / 2,
            delay: data.delay,
            repeat: -1,
            yoyo: true,
            ease: 'power1.inOut'
          }
        );
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Gradiente base */}
      <div className="absolute inset-0 bg-gradient-to-br from-f1-dark via-f1-gray to-f1-dark" />

      {/* Gradiente animado sutil */}
      <div
        ref={gradientRef}
        className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-f1-red/10 via-transparent to-f1-red/5"
        style={{ opacity: 0.1 }}
      />

      {/* Partículas flotantes */}
      {particulas.map((particula, index) => (
        <div
          key={particula.id}
          ref={(el) => (particlesRef.current[index] = el)}
          className="absolute rounded-full blur-3xl"
          style={{
            left: `${particula.x}vw`,
            top: `${particula.y}vh`,
            width: particula.size,
            height: particula.size,
            background: `radial-gradient(circle, rgba(225, 6, 0, 0.2) 0%, transparent 70%)`,
            opacity: 0,
            transform: 'scale(0)'
          }}
        />
      ))}

      {/* Efecto de grid sutil */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]" />
    </div>
  );
};

export default FondoAnimado;
