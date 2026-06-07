import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const FondoAnimado = () => {
  const laneRef = useRef(null);
  const scanRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      if (laneRef.current) {
        gsap.to(laneRef.current, {
          backgroundPosition: '220px 220px',
          duration: 18,
          repeat: -1,
          ease: 'none'
        });
      }

      if (scanRef.current) {
        gsap.to(scanRef.current, {
          yPercent: 100,
          duration: 7,
          repeat: -1,
          ease: 'none'
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-f1-dark">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,180,167,0.12),transparent_38rem),linear-gradient(135deg,#120806_0%,#210e0b_52%,#15151e_100%)]" />

      <div
        ref={laneRef}
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: [
            'linear-gradient(rgba(255,180,167,0.06) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(255,180,167,0.045) 1px, transparent 1px)',
            'repeating-linear-gradient(135deg, transparent 0 42px, rgba(255,85,61,0.08) 42px 44px, transparent 44px 88px)'
          ].join(', '),
          backgroundSize: '32px 32px, 32px 32px, 220px 220px'
        }}
      />

      <div className="absolute inset-y-0 left-[12%] w-px bg-gradient-to-b from-transparent via-f1-copper/25 to-transparent" />
      <div className="absolute inset-y-0 right-[18%] w-px bg-gradient-to-b from-transparent via-f1-red/20 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/65 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/70 to-transparent" />

      <div
        ref={scanRef}
        className="absolute -top-1/2 left-0 right-0 h-1/2 bg-gradient-to-b from-transparent via-white/[0.035] to-transparent"
      />
    </div>
  );
};

export default FondoAnimado;
