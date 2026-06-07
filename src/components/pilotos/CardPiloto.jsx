import { useRef, useCallback } from 'react';
import gsap from 'gsap';
import { getDriverNationality } from '../../utils/nationalityUtils';
import { getDriverFlag } from '../../utils/flagUtils.jsx';
import { getTeamLogo, getDriverPhoto } from '../../utils/formatUtils';

const CardPiloto = ({ piloto, onClick }) => {
  const cardRef = useRef(null);
  const contentRef = useRef(null);
  const logoRef = useRef(null);
  const photoRef = useRef(null);
  const nameRef = useRef(null);
  const numRef = useRef(null);

  const nacionalidad = getDriverNationality(piloto);
  const iniciales = piloto.name_acronym ||
    (piloto.full_name ? piloto.full_name.split(' ').map(n => n[0]).join('').substring(0, 3) : '???');
  const fotoUrl = getDriverPhoto(piloto) || piloto.headshot_url;
  const banderaUrl = getDriverFlag(piloto);

  const hexToRgb = (hex) => {
    if (!hex) return { r: 128, g: 128, b: 128 };
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 128, g: 128, b: 128 };
  };

  const teamColor = piloto.team_colour ? `#${piloto.team_colour.replace('#', '')}` : '#808080';
  const rgb = hexToRgb(teamColor);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current || !contentRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    // Normalize coordinates from -1 to 1
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

    gsap.to(contentRef.current, {
      rotateX: -y * 15,
      rotateY: x * 15,
      scale: 1.05,
      boxShadow: `${-x * 20}px ${y * 20}px 30px rgba(0,0,0,0.5)`,
      duration: 0.4,
      ease: 'power2.out',
      transformPerspective: 1000
    });

    // Parallax effect on inner elements
    if (photoRef.current) {
      gsap.to(photoRef.current, {
        x: x * 20,
        y: y * 20,
        scale: 1.1,
        duration: 0.4,
        ease: 'power2.out'
      });
    }

    if (numRef.current) {
      gsap.to(numRef.current, {
        x: x * 30,
        y: y * 30,
        rotateY: x * 20,
        duration: 0.4,
        ease: 'power2.out'
      });
    }

    if (logoRef.current) {
      gsap.to(logoRef.current, {
        x: -x * 15,
        y: -y * 15,
        opacity: 0.3,
        duration: 0.4,
        ease: 'power2.out'
      });
    }

    if (nameRef.current) {
      gsap.to(nameRef.current, {
        color: teamColor,
        textShadow: `0 0 15px rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`,
        duration: 0.2
      });
    }
  }, [teamColor, rgb]);

  const handleMouseLeave = useCallback(() => {
    if (!contentRef.current) return;

    gsap.to(contentRef.current, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      boxShadow: `0 10px 30px rgba(0,0,0,0.3)`,
      duration: 0.7,
      ease: 'elastic.out(1, 0.5)'
    });

    if (photoRef.current) {
      gsap.to(photoRef.current, { x: 0, y: 0, scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
    }

    if (numRef.current) {
      gsap.to(numRef.current, { x: 0, y: 0, rotateY: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
    }

    if (logoRef.current) {
      gsap.to(logoRef.current, { x: 0, y: 0, opacity: 0.08, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
    }

    if (nameRef.current) {
      gsap.to(nameRef.current, { color: '#ffffff', textShadow: 'none', duration: 0.4 });
    }
  }, []);

  const handleTap = useCallback(() => {
    if (!contentRef.current) return;
    gsap.to(contentRef.current, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out'
    });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => { handleTap(); onClick?.(); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTap();
          onClick?.();
        }
      }}
      className="relative w-full aspect-[4/5] cursor-pointer group"
      style={{ perspective: '1200px' }}
      role="button"
      tabIndex={0}
      aria-label={`Abrir ficha de ${piloto.full_name || 'piloto'}`}
    >
      <div
        ref={contentRef}
        className="w-full h-full p-5 flex flex-col justify-end overflow-hidden relative"
        style={{
          transformStyle: 'preserve-3d',
          clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))',
          background: `linear-gradient(150deg, rgba(${rgb.r},${rgb.g},${rgb.b},0.2) 0%, rgba(21,21,30,0.88) 42%, rgba(18,8,6,0.95) 100%)`,
          border: `1px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.48)`,
          boxShadow: `0 16px 36px rgba(0,0,0,0.38), inset 4px 0 0 rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`
        }}
      >
        <div className="absolute inset-0 bg-technical-grid opacity-35 pointer-events-none" />

        {/* Abstract Background Image/Logo */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ transform: 'translateZ(-50px)' }}>
          <img
            ref={logoRef}
            src={getTeamLogo(piloto.team_name)}
            alt=""
            className="absolute -right-10 -bottom-10 w-64 h-64 object-contain filter saturate-0 blend-overlay"
            style={{ opacity: 0.08 }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        {/* Big Number Background */}
        <div
          ref={numRef}
          className="absolute -top-4 -right-2 font-mono text-[7.5rem] font-extrabold leading-none pointer-events-none"
          style={{
            color: 'transparent',
            WebkitTextStroke: `1px rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`,
            transform: 'translateZ(-20px)'
          }}
        >
          {piloto.driver_number || '?'}
        </div>

        {/* Driver Photo Center/Top */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-44 h-44 pointer-events-none" style={{ transform: 'translateZ(30px)' }}>
          {fotoUrl && (
            <img
              ref={photoRef}
              src={fotoUrl}
              alt=""
              className="w-full h-full object-cover object-top drop-shadow-[0_18px_18px_rgba(0,0,0,0.62)] filter contrast-125 saturate-110"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
        </div>

        {/* Info Area */}
        <div className="relative z-10 w-full mt-auto" style={{ transform: 'translateZ(40px)' }}>
          {/* Nationality & Initials */}
          <div className="flex items-center justify-between mb-2 opacity-80">
            <div className="flex items-center space-x-2">
              {banderaUrl && (
                <img
                  src={banderaUrl}
                  className="w-5 h-3.5 object-cover rounded shadow-md"
                  onError={e => e.target.style.display = 'none'}
                  alt=""
                />
              )}
            <span className="data-label text-white/75">{nacionalidad}</span>
            </div>
            <span className="font-mono text-[10px] font-bold tracking-[0.14em] bg-white/10 px-2 py-1 text-white border border-white/10">{iniciales}</span>
          </div>

          {/* Name */}
          <h3
            ref={nameRef}
            className="text-3xl font-racing italic text-white leading-none uppercase tracking-normal mb-2 transition-colors duration-300"
          >
            {piloto.full_name}
          </h3>

          <div className="flex items-center space-x-2 pt-3 border-t border-white/10">
            <img
              src={getTeamLogo(piloto.team_name)}
              alt=""
              className="w-5 h-5 object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="data-label text-white/50 line-clamp-1">
              {piloto.team_name}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="border border-white/10 bg-black/20 px-2 py-2">
              <p className="data-label">POS</p>
              <p className="data-value text-lg">{piloto.position || '-'}</p>
            </div>
            <div className="border border-white/10 bg-black/20 px-2 py-2">
              <p className="data-label">Pts</p>
              <p className="data-value text-lg">{piloto.points || 0}</p>
            </div>
            <div className="border border-white/10 bg-black/20 px-2 py-2">
              <p className="data-label">WIN</p>
              <p className="data-value text-lg">{piloto.wins || 0}</p>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 pointer-events-none border border-transparent group-hover:border-white/20 transition-colors duration-500" style={{ transform: 'translateZ(10px)' }} />
      </div>
    </div>
  );
};

export default CardPiloto;
