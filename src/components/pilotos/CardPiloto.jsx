import { useRef, useCallback } from 'react';
import gsap from 'gsap';
import { User, Flag } from 'lucide-react';
import { getDriverNationality } from '../../utils/nationalityUtils';
import { getDriverFlag } from '../../utils/flagUtils.jsx';
import { getTeamLogo, getDriverPhoto } from '../../utils/formatUtils';

const CardPiloto = ({ piloto, onClick }) => {
  const cardRef = useRef(null);
  const logoRef = useRef(null);
  const photoRef = useRef(null);
  const nameRef = useRef(null);
  const barRef = useRef(null);
  const teamLogoRef = useRef(null);

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

  const cardStyle = {
    background: `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08) 50%, rgba(0, 0, 0, 0.4) 100%)`,
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`,
    boxShadow: `0 4px 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15), 0 0 0 1px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`
  };

  const gradientBarStyle = {
    background: `linear-gradient(90deg, ${teamColor}, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6))`,
    width: 0
  };

  const handleMouseEnter = useCallback(() => {
    // Card hover
    gsap.to(cardRef.current, {
      y: -8,
      scale: 1.02,
      boxShadow: `0 8px 30px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25), 0 0 0 1px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`,
      duration: 0.3,
      ease: 'power2.out'
    });

    // Logo de fondo
    if (logoRef.current) {
      gsap.to(logoRef.current, {
        scale: 1.05,
        rotation: -5,
        x: -5,
        opacity: 0.15,
        filter: 'blur(0px) brightness(1.5) contrast(1.2)',
        duration: 0.4,
        ease: 'power2.out'
      });
    }

    // Foto del piloto
    if (photoRef.current) {
      gsap.to(photoRef.current, {
        scale: 1.05,
        rotation: 2,
        duration: 0.3,
        ease: 'power2.out'
      });
    }

    // Nombre
    if (nameRef.current) {
      gsap.to(nameRef.current, {
        color: teamColor,
        duration: 0.3
      });
    }

    // Barra de progreso
    if (barRef.current) {
      gsap.to(barRef.current, {
        width: '100%',
        duration: 0.4,
        ease: 'power2.out'
      });
    }

    // Logo del equipo pequeño
    if (teamLogoRef.current) {
      gsap.to(teamLogoRef.current, {
        scale: 1.1,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  }, [rgb, teamColor]);

  const handleMouseLeave = useCallback(() => {
    // Card
    gsap.to(cardRef.current, {
      y: 0,
      scale: 1,
      boxShadow: `0 4px 20px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15), 0 0 0 1px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
      duration: 0.3,
      ease: 'power2.out'
    });

    // Logo de fondo
    if (logoRef.current) {
      gsap.to(logoRef.current, {
        scale: 1,
        rotation: 0,
        x: 0,
        opacity: 0.08,
        filter: 'blur(0.5px) brightness(1.3) contrast(1.1)',
        duration: 0.4,
        ease: 'power2.out'
      });
    }

    // Foto
    if (photoRef.current) {
      gsap.to(photoRef.current, {
        scale: 1,
        rotation: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
    }

    // Nombre
    if (nameRef.current) {
      gsap.to(nameRef.current, {
        color: '#ffffff',
        duration: 0.3
      });
    }

    // Barra
    if (barRef.current) {
      gsap.to(barRef.current, {
        width: 0,
        duration: 0.3,
        ease: 'power2.in'
      });
    }

    // Logo equipo
    if (teamLogoRef.current) {
      gsap.to(teamLogoRef.current, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  }, [rgb]);

  const handleTap = useCallback(() => {
    gsap.to(cardRef.current, {
      scale: 0.98,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out'
    });
  }, []);

  return (
    <div
      ref={cardRef}
      onClick={() => { handleTap(); onClick?.(); }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="backdrop-blur-sm border rounded-2xl p-6 cursor-pointer group overflow-hidden transition-colors duration-300 relative"
      style={cardStyle}
      role="button"
      tabIndex={0}
      aria-label={`Ver detalles de ${piloto.full_name || 'piloto'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      {/* Logo de fondo difuminado */}
      <div className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none overflow-hidden">
        <img
          ref={logoRef}
          src={getTeamLogo(piloto.team_name)}
          alt={`Logo ${piloto.team_name}`}
          className="w-24 h-24 object-contain"
          style={{
            opacity: 0.08,
            filter: 'blur(0.5px) brightness(1.3) contrast(1.1)',
            transform: 'translateX(10px)',
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%)'
          }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>

      {/* Contenido principal */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="relative">
            {fotoUrl ? (
              <div
                ref={photoRef}
                className="w-20 h-20 rounded-xl overflow-hidden shadow-lg"
                style={{ boxShadow: `0 4px 15px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)` }}
              >
                <img 
                  src={fotoUrl} 
                  alt={piloto.full_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div 
                  className="w-full h-full flex items-center justify-center hidden"
                  style={{ 
                    display: 'none',
                    background: `linear-gradient(135deg, ${teamColor}, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8))`
                  }}
                >
                  <span className="text-3xl font-bold text-white">
                    {piloto.driver_number || '?'}
                  </span>
                </div>
              </div>
            ) : (
              <div
                ref={photoRef}
                className="w-20 h-20 rounded-xl flex items-center justify-center shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${teamColor}, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8))`,
                  boxShadow: `0 4px 15px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`
                }}
              >
                <span className="text-3xl font-bold text-white">
                  {piloto.driver_number || '?'}
                </span>
              </div>
            )}
          </div>

          {nacionalidad && nacionalidad !== 'No disponible' && (
            <div className="flex items-center space-x-2 text-white/60 text-xs">
              {banderaUrl ? (
                <img 
                  src={banderaUrl} 
                  alt={`Bandera de ${nacionalidad}`}
                  className="w-4 h-3 rounded-sm object-cover shadow-sm"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'block';
                  }}
                />
              ) : null}
              <Flag 
                className="w-4 h-4 hidden" 
                style={{ display: banderaUrl ? 'none' : 'block' }}
              />
              <span className="font-medium">{nacionalidad}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 
            ref={nameRef}
            className="text-xl font-bold text-white line-clamp-1"
          >
            {piloto.full_name || 'Nombre no disponible'}
          </h3>

          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-white/40" />
            <span className="text-sm font-mono text-white/70 tracking-wider">
              {iniciales}
            </span>
          </div>

          {piloto.team_name && (
            <div className="pt-2 mt-2 border-t border-white/10">
              <p className="text-xs text-white/50">Equipo</p>
              <div className="flex items-center space-x-2">
                <img
                  ref={teamLogoRef}
                  src={getTeamLogo(piloto.team_name)}
                  alt={`Logo ${piloto.team_name}`}
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <p className="text-sm font-semibold text-white/80 line-clamp-1">
                  {piloto.team_name}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div
          ref={barRef}
          className="h-1 rounded-full mt-4"
          style={gradientBarStyle}
        />
      </div>
    </div>
  );
};

export default CardPiloto;
