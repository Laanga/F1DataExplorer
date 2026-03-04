import { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Users, TrendingUp } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getConstructorStandingsFromErgast, getCurrentYear } from '../../services/openf1Service';
import { getTeamLogo } from '../../utils/formatUtils';
import Loader from '../ui/Loader';

gsap.registerPlugin(ScrollTrigger);

const ClasificacionConstructores = () => {
  const [constructores, setConstructores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('loading');

  // Refs para animaciones
  const containerRef = useRef(null);
  const headerIconRef = useRef(null);
  const itemsRef = useRef([]);
  const noteRef = useRef(null);

  useEffect(() => {
    const cargarConstructores = async () => {
      try {
        setLoading(true);
        const data = await getConstructorStandingsFromErgast();
        setConstructores(data);
        setDataSource(data.length > 0 && data[0].points > 0 ? 'real' : 'base');
      } catch (error) {
        console.error('❌ Error al cargar constructores:', error);
        setDataSource('error');
      } finally {
        setLoading(false);
      }
    };

    cargarConstructores();
  }, []);

  // Animaciones GSAP
  useEffect(() => {
    if (loading || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Container entrada
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.6, ease: 'power3.out' }
      );

      // Items stagger
      const validItems = itemsRef.current.filter(Boolean);
      if (validItems.length > 0) {
        gsap.fromTo(validItems,
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.5, stagger: 0.1, delay: 0.8, ease: 'power2.out' }
        );
      }

      // Note
      if (noteRef.current) {
        gsap.fromTo(noteRef.current,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.4, delay: 1.2, ease: 'power2.out' }
        );
      }
    });

    return () => ctx.revert();
  }, [loading, constructores.length]);

  // Hover handlers
  const handleIconHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.1 : 1,
      rotation: isHovering ? 5 : 0,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleItemHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.02 : 1,
      y: isHovering ? -2 : 0,
      boxShadow: isHovering ? '0 10px 30px rgba(59, 130, 246, 0.2)' : 'none',
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handlePositionHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.1 : 1,
      rotation: isHovering ? 5 : 0,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleLogoHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.05 : 1,
      rotation: isHovering ? 2 : 0,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleStatHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.05 : 1,
      duration: 0.2,
      ease: 'power2.out'
    });
  }, []);

  if (loading) {
    return <Loader />;
  }

  return (
    <div
      ref={containerRef}
      className="glass glass-hover rounded-3xl p-8 shadow-glass mb-10"
      style={{ opacity: 0 }}
    >
      <div className="flex items-center space-x-3 mb-8">
        <div
          ref={headerIconRef}
          onMouseEnter={(e) => handleIconHover(e, true)}
          onMouseLeave={(e) => handleIconHover(e, false)}
          className="cursor-pointer"
        >
          <Users className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-white text-glow">Clasificación de Constructores</h2>
        <div className="flex items-center gap-2 ml-auto">
          <div className={`w-2 h-2 rounded-full ${dataSource === 'real' ? 'bg-green-400' : 'bg-yellow-400'}`} />
          <span className="text-xs text-gray-400">
            {dataSource === 'real' ? 'Fuente oficial' : 'Actualización de temporada'}
          </span>
        </div>
      </div>

      {constructores.length > 0 ? (
        <div className="space-y-4">
          {constructores.slice(0, 11).map((constructor, index) => (
            <div
              key={constructor.constructor?.name || index}
              ref={(el) => (itemsRef.current[index] = el)}
              onMouseEnter={(e) => handleItemHover(e, true)}
              onMouseLeave={(e) => handleItemHover(e, false)}
              className={`
                glass glass-hover rounded-2xl p-6 border transition-all duration-300 cursor-pointer
                ${index < 3 
                  ? `border-yellow-400/30 bg-gradient-to-r ${
                      index === 0 ? 'from-yellow-400/20 to-yellow-600/10' :
                      index === 1 ? 'from-gray-300/20 to-gray-500/10' :
                      'from-amber-600/20 to-amber-800/10'
                    }` 
                  : 'border-white/10 hover:border-blue-400/30'
                }
              `}
              style={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  {/* Posición */}
                  <div 
                    onMouseEnter={(e) => handlePositionHover(e, true)}
                    onMouseLeave={(e) => handlePositionHover(e, false)}
                    className={`
                      w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg cursor-pointer
                      ${index < 3 
                        ? index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-yellow-400/30' :
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-gray-400/30' :
                          'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-amber-600/30'
                        : 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-blue-500/30'
                      }
                    `}
                  >
                    {constructor.position || index + 1}
                  </div>

                  {/* Logo del equipo */}
                  <div
                    onMouseEnter={(e) => handleLogoHover(e, true)}
                    onMouseLeave={(e) => handleLogoHover(e, false)}
                    className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg cursor-pointer"
                  >
                    <img
                      src={getTeamLogo(constructor.constructor?.name || constructor.team_name)}
                      alt={`${constructor.constructor?.name || constructor.team_name} logo`}
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        e.target.src = '/images/teams/default.png';
                      }}
                    />
                    {/* Shimmer para podio */}
                    {index < 3 && (
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                        style={{ animation: 'shimmer 2s ease-in-out infinite' }}
                      />
                    )}
                  </div>

                  {/* Info del constructor */}
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-xl mb-1">
                      {constructor.constructor?.name || constructor.team_name}
                    </h3>
                    <p className="text-white/60 text-sm font-medium">
                      {constructor.constructor?.nationality}
                    </p>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="flex items-center space-x-6">
                  <div 
                    onMouseEnter={(e) => handleStatHover(e, true)}
                    onMouseLeave={(e) => handleStatHover(e, false)}
                    className="text-center cursor-pointer"
                  >
                    <p className="text-2xl font-bold text-white">{constructor.points || 0}</p>
                    <p className="text-white/60 text-sm">Puntos</p>
                  </div>
                  
                  <div 
                    onMouseEnter={(e) => handleStatHover(e, true)}
                    onMouseLeave={(e) => handleStatHover(e, false)}
                    className="text-center cursor-pointer"
                  >
                    <p className="text-2xl font-bold text-green-400">{constructor.wins || 0}</p>
                    <p className="text-white/60 text-sm">Victorias</p>
                  </div>

                  <div 
                    onMouseEnter={(e) => handleStatHover(e, true)}
                    onMouseLeave={(e) => handleStatHover(e, false)}
                    className="text-center cursor-pointer"
                  >
                    <p className="text-2xl font-bold text-blue-400">{constructor.podiums || 0}</p>
                    <p className="text-white/60 text-sm">Podios</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No hay datos de constructores disponibles</p>
          <p className="text-gray-500 text-sm mt-2">
            {dataSource === 'error' ? 'Error al cargar datos' : 'Esperando datos de la temporada'}
          </p>
        </div>
      )}

      {dataSource === 'real' && constructores.length > 0 && (
        <div 
          ref={noteRef}
          className="mt-6 p-4 glass rounded-xl border border-green-400/30 bg-gradient-to-r from-green-400/10 to-green-600/5"
          style={{ opacity: 0 }}
        >
          <p className="text-green-400 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <strong>Datos oficiales</strong> de la clasificación de constructores {getCurrentYear()}
          </p>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default ClasificacionConstructores;
