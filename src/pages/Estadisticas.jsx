import { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Users, Flag, BarChart3, Zap, Timer, Gauge, Database } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getDriverStandingsFromErgast, getConstructorStandingsFromErgast, getCurrentYear, getStatistics, getChampionshipStandings } from '../services/openf1Service';
import { getChartColor, assignColorsToData, DRIVER_COLORS, getTeamColor, getDriverTeamColor, assignTeamColorsToDrivers } from '../utils/chartColors';
import { getDriverPhoto } from '../utils/formatUtils';
import { useYear } from '../contexts/YearContext';
import GraficaPuntos from '../components/estadisticas/GraficaPuntos';
import PanelEstadisticas from '../components/estadisticas/PanelEstadisticas';
import ClasificacionConstructores from '../components/estadisticas/ClasificacionConstructores';
import Loader from '../components/ui/Loader';

gsap.registerPlugin(ScrollTrigger);

/**
 * Página de Estadísticas - Vista general del campeonato
 */
const Estadisticas = () => {
  const [stats, setStats] = useState({});
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { selectedYear } = useYear();

  // Refs para animaciones GSAP
  const headerRef = useRef(null);
  const graficasRef = useRef(null);
  const clasificacionRef = useRef(null);
  const clasificacionItemsRef = useRef([]);
  const constructoresRef = useRef(null);
  const recordsRef = useRef(null);
  const recordCardsRef = useRef([]);
  const finalNoteRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const cargarEstadisticas = async () => {
      try {
        setLoading(true);
        const [estadisticas, equiposData] = await Promise.all([
          getStatistics({ signal }),
          getChampionshipStandings({ signal })
        ]);

        setStats(estadisticas);
        setEquipos(equiposData);
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        setError('Error al cargar las estadísticas');
      } finally {
        setLoading(false);
      }
    };

    cargarEstadisticas();

    return () => {
      controller.abort();
    };
  }, []);

  // Animaciones GSAP
  useEffect(() => {
    if (loading || !headerRef.current) return;

    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -50 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
      );

      // Gráficas animation
      if (graficasRef.current) {
        gsap.fromTo(
          graficasRef.current.children,
          { opacity: 0, x: -100, rotateY: -20 },
          {
            opacity: 1,
            x: 0,
            rotateY: 0,
            duration: 1,
            stagger: 0.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: graficasRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            }
          }
        );
      }

      // Clasificación de pilotos
      if (clasificacionRef.current) {
        gsap.fromTo(
          clasificacionRef.current,
          { opacity: 0, scale: 0.8 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: 'back.out(1.4)',
            scrollTrigger: {
              trigger: clasificacionRef.current,
              start: 'top 80%',
            }
          }
        );

        // Items de clasificación
        const validItems = clasificacionItemsRef.current.filter(Boolean);
        if (validItems.length > 0) {
          gsap.fromTo(
            validItems,
            { opacity: 0, x: -50 },
            {
              opacity: 1,
              x: 0,
              duration: 0.6,
              stagger: 0.05,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: clasificacionRef.current,
                start: 'top 70%',
              }
            }
          );
        }
      }

      // Constructores
      if (constructoresRef.current) {
        gsap.fromTo(
          constructoresRef.current,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: constructoresRef.current,
              start: 'top 80%',
            }
          }
        );
      }

      // Récords con efecto de explosión
      if (recordsRef.current) {
        const validCards = recordCardsRef.current.filter(Boolean);
        if (validCards.length > 0) {
          gsap.fromTo(
            validCards,
            { opacity: 0, scale: 0, rotation: -180 },
            {
              opacity: 1,
              scale: 1,
              rotation: 0,
              duration: 0.8,
              stagger: 0.15,
              ease: 'back.out(1.7)',
              scrollTrigger: {
                trigger: recordsRef.current,
                start: 'top 80%',
              }
            }
          );
        }
      }

      // Final note animation
      if (finalNoteRef.current) {
        gsap.fromTo(
          finalNoteRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            delay: 1.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: finalNoteRef.current,
              start: 'top 90%',
            }
          }
        );

        // Gradient pulse
        const gradient = finalNoteRef.current.querySelector('.gradient-pulse');
        if (gradient) {
          gsap.to(gradient, {
            keyframes: [
              { scale: 1, opacity: 0.3 },
              { scale: 1.2, opacity: 0.5 },
              { scale: 1, opacity: 0.3 },
            ],
            duration: 3,
            repeat: -1,
            ease: 'power1.inOut',
          });
        }
      }
    });

    return () => ctx.revert();
  }, [loading, stats]);

  // Hover handlers
  const handleItemHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.02 : 1,
      y: isHovering ? -2 : 0,
      boxShadow: isHovering ? '0 10px 30px rgba(225, 6, 0, 0.2)' : 'none',
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handlePositionHover = useCallback((e, isHovering, index) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.15 : 1,
      rotation: isHovering ? 3 : 0,
      duration: 0.3,
      ease: isHovering ? 'power2.out' : 'elastic.out(1, 0.5)'
    });
  }, []);

  const handlePhotoHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.1 : 1,
      rotation: isHovering ? 3 : 0,
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

  const handleRecordHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.02 : 1,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleRecordCardHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.05 : 1,
      x: isHovering ? 5 : 0,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Loader mensaje="Analizando estadísticas..." />
      </div>
    );
  }

  if (error || !stats || Object.keys(stats).length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-white/70">{error || "Error al cargar estadísticas"}</p>
        </div>
      </div>
    );
  }

  // Preparar datos para gráficas
  const topPilotos = stats.topDrivers?.slice(0, 20).map((piloto, index) => ({
    name: piloto.driver?.code || piloto.driver?.familyName || 'Piloto',
    value: parseInt(piloto.points) || 0,
    color: getDriverTeamColor(piloto),
    teamName: piloto.constructor?.name || 'Equipo',
    showDriverPhoto: true,
    driverData: piloto.driver
  })) || [];

  const getTeamLogo = (teamName) => {
    const teamLogos = {
      'Red Bull': '/teams/red-bull.png',
      'Red Bull Racing': '/teams/red-bull.png',
      'Mercedes': '/teams/mercedes.png',
      'Ferrari': '/teams/ferrari.png',
      'McLaren': '/teams/mclaren.png',
      'Aston Martin': '/teams/aston-martin.png',
      'Alpine': '/teams/alpine.png',
      'Alpine F1 Team': '/teams/alpine.png',
      'Williams': '/teams/williams.png',
      'Haas': '/teams/haas.png',
      'Haas F1 Team': '/teams/haas.png',
      'Kick Sauber': '/teams/kick.png',
      'Sauber': '/teams/kick.png',
      'RB': '/teams/visa-red.png',
      'RB F1 Team': '/teams/visa-red.png',
    };

    if (teamLogos[teamName]) return teamLogos[teamName];

    const teamNameLower = teamName.toLowerCase();
    if (teamNameLower.includes('aston')) return '/teams/aston-martin.png';
    if (teamNameLower.includes('sauber') || teamNameLower.includes('kick')) return '/teams/kick.png';
    if (teamNameLower.includes('red bull')) return '/teams/red-bull.png';
    if (teamNameLower.includes('mercedes')) return '/teams/mercedes.png';
    if (teamNameLower.includes('ferrari')) return '/teams/ferrari.png';
    if (teamNameLower.includes('mclaren')) return '/teams/mclaren.png';
    if (teamNameLower.includes('alpine')) return '/teams/alpine.png';
    if (teamNameLower.includes('williams')) return '/teams/williams.png';
    if (teamNameLower.includes('haas')) return '/teams/haas.png';
    if (teamNameLower.includes('rb') || teamNameLower.includes('racing bulls')) return '/teams/visa-red.png';

    return '/teams/red-bull.png';
  };

  const datosEquipos = (equipos?.constructors || [])
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 10)
    .map(equipo => ({
      name: equipo.team_name || 'Equipo',
      value: parseInt(equipo.points) || 0,
      color: getTeamColor(equipo.team_name || ''),
      teamName: equipo.team_name || 'Equipo',
      logo: getTeamLogo(equipo.team_name || 'Equipo'),
      showLogo: true
    }));

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-x-hidden">
      {/* Header */}
      <div ref={headerRef} style={{ opacity: 0 }}>
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Estadísticas
            <span className="text-f1-red font-bold ml-3">Temporada {selectedYear}</span>
          </h1>
          <p className="text-white/60 text-lg">
            Visualización completa de la temporada {selectedYear}
          </p>
        </div>
      </div>

      {/* Gráficas */}
      <div ref={graficasRef} className="grid grid-cols-1 gap-6 mb-10">
        <div>
          <GraficaPuntos
            datos={topPilotos}
            tipo="barra"
            titulo="Top 20 Pilotos - Puntos del Campeonato"
          />
        </div>
        <div>
          <GraficaPuntos
            datos={datosEquipos}
            tipo="barra"
            titulo={`Comparativa de Equipos - Temporada ${selectedYear}`}
          />
        </div>
      </div>

      {/* Clasificación de Pilotos */}
      <div ref={clasificacionRef} className="glass glass-hover rounded-3xl p-4 sm:p-8 shadow-glass mb-10" style={{ opacity: 0 }}>
        <div className="flex items-center space-x-3 mb-8">
          <div className="transition-transform hover:scale-110 hover:rotate-5 duration-300">
            <Trophy className="w-8 h-8 text-f1-red" />
          </div>
          <h2 className="text-3xl font-bold text-white text-glow">Clasificación de Pilotos</h2>
          <div className="flex items-center gap-2 ml-auto">
            <div className={`w-2 h-2 rounded-full ${stats.dataSource === 'real' ? 'bg-green-400' : 'bg-yellow-400'}`} />
            <span className="text-xs text-gray-400">
              {stats.dataSource === 'real' ? 'Datos Reales' : 'Datos Base'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {stats.topDrivers?.length > 0 ? (
            stats.topDrivers.slice(0, 20).map((driver, index) => (
              <div
                key={driver.driver_number || index}
                ref={el => clasificacionItemsRef.current[index] = el}
                onMouseEnter={(e) => handleItemHover(e, true)}
                onMouseLeave={(e) => handleItemHover(e, false)}
                className={`
                  clasificacion-item glass glass-hover rounded-2xl p-4 sm:p-6 border transition-all duration-300 cursor-pointer
                  ${index < 3
                    ? `border-yellow-400/30 bg-gradient-to-r ${
                        index === 0 ? 'from-yellow-400/20 to-yellow-600/10' :
                        index === 1 ? 'from-gray-300/20 to-gray-500/10' :
                        'from-amber-600/20 to-amber-800/10'
                      }`
                    : 'border-white/10 hover:border-f1-red/30'
                  }
                `}
                style={{ opacity: 0 }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                    {/* Posición */}
                    <div
                      onMouseEnter={(e) => handlePositionHover(e, true, index)}
                      onMouseLeave={(e) => handlePositionHover(e, false, index)}
                      className={`
                        relative w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-lg overflow-hidden
                        ${index === 0
                          ? 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-black border border-yellow-300/50' :
                          index === 1
                          ? 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 text-black border border-gray-200/50' :
                          index === 2
                          ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white border border-amber-500/50' :
                          'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 text-white border border-slate-500/50'
                        }
                        backdrop-blur-sm shadow-2xl
                      `}
                    >
                      {/* Shimmer para podio */}
                      {index < 3 && (
                        <div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                          style={{ animation: 'shimmer 2s ease-in-out infinite' }}
                        />
                      )}
                      <span className="relative z-10 font-extrabold tracking-tight">
                        {driver.position || index + 1}
                      </span>
                    </div>

                    {/* Foto del piloto */}
                    <div
                      onMouseEnter={(e) => handlePhotoHover(e, true)}
                      onMouseLeave={(e) => handlePhotoHover(e, false)}
                      className="relative"
                    >
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-gradient-to-br from-slate-800 to-slate-900">
                        <img
                          src={getDriverPhoto(driver.driver) || '/drivers/default.png'}
                          alt={`${driver.driver?.givenName} ${driver.driver?.familyName}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = '/drivers/default.png';
                          }}
                        />
                      </div>
                    </div>

                    {/* Información del piloto */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-base sm:text-xl mb-1 truncate">
                        {driver.driver?.givenName} {driver.driver?.familyName}
                      </h3>
                      <p className="text-white/60 text-sm font-medium">
                        {driver.constructor?.name}
                      </p>
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <div className="flex sm:flex-row items-center gap-6 sm:gap-8 w-full sm:w-auto justify-start sm:justify-end">
                    <div
                      onMouseEnter={(e) => handleStatHover(e, true)}
                      onMouseLeave={(e) => handleStatHover(e, false)}
                      className="text-center cursor-pointer"
                    >
                      <p className="text-xl sm:text-2xl font-bold text-white">{driver.points || 0}</p>
                      <p className="text-white/60 text-sm">Puntos</p>
                    </div>

                    <div
                      onMouseEnter={(e) => handleStatHover(e, true)}
                      onMouseLeave={(e) => handleStatHover(e, false)}
                      className="text-center cursor-pointer"
                    >
                      <p className="text-xl sm:text-2xl font-bold text-yellow-400">{driver.wins || 0}</p>
                      <p className="text-white/60 text-sm">Victorias</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400">No hay datos de clasificación disponibles</p>
            </div>
          )}
        </div>
      </div>

      {/* Clasificación de Constructores */}
      <div ref={constructoresRef} style={{ opacity: 0 }}>
        <ClasificacionConstructores />
      </div>

      {/* Records grid */}
      <div ref={recordsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
        {/* Récords */}
        <div
          ref={el => recordCardsRef.current[0] = el}
          onMouseEnter={(e) => handleRecordHover(e, true)}
          onMouseLeave={(e) => handleRecordHover(e, false)}
          className="glass rounded-2xl p-6 relative overflow-hidden cursor-pointer"
          style={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-f1-red/10 to-transparent pointer-events-none" />

          <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2 relative z-10">
            <Trophy className="w-5 h-5 text-f1-red" />
            <span>Récords de la Temporada</span>
          </h3>

          <div className="space-y-3 relative z-10">
            {[
              { icon: Timer, color: 'text-f1-red', bg: 'from-f1-red/20', title: 'Vuelta más rápida', value: '1:18.567', sub: 'Monza - Italia' },
              { icon: Gauge, color: 'text-amber-400', bg: 'from-amber-500/20', title: 'Mayor diferencia', value: '45.2s', sub: 'GP de Mónaco' },
              { icon: Zap, color: 'text-blue-400', bg: 'from-blue-500/20', title: 'Pit Stop más rápido', value: '1.82s', sub: 'Red Bull Racing' }
            ].map((record, i) => (
              <div
                key={record.title}
                onMouseEnter={(e) => handleRecordCardHover(e, true)}
                onMouseLeave={(e) => handleRecordCardHover(e, false)}
                className="glass-dark rounded-xl p-4 relative overflow-hidden group cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${record.bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="flex items-center space-x-3 relative z-10">
                  <record.icon className={`w-5 h-5 ${record.color}`} />
                  <div className="flex-1">
                    <p className="text-white/60 text-sm mb-1">{record.title}</p>
                    <p className="text-white font-bold text-lg">{record.value}</p>
                    <p className="text-white/50 text-xs mt-1">{record.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fuentes de Datos */}
        <div
          ref={el => recordCardsRef.current[1] = el}
          onMouseEnter={(e) => handleRecordHover(e, true)}
          onMouseLeave={(e) => handleRecordHover(e, false)}
          className="glass rounded-2xl p-6 relative overflow-hidden cursor-pointer"
          style={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />

          <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2 relative z-10">
            <Database className="w-5 h-5 text-blue-400" />
            <span>Fuentes de Datos</span>
          </h3>

          <div className="space-y-3 relative z-10">
            <div
              onMouseEnter={(e) => handleRecordCardHover(e, true)}
              onMouseLeave={(e) => handleRecordCardHover(e, false)}
              className="glass-dark rounded-xl p-4 relative overflow-hidden group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-f1-red/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <p className="text-white/60 text-sm mb-2">API Principal</p>
                <a
                  href="https://openf1.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-f1-red hover:text-f1-red/80 font-semibold transition-colors text-lg flex items-center space-x-2"
                >
                  <span>OpenF1</span>
                  <span className="animate-pulse">→</span>
                </a>
                <p className="text-white/50 text-xs mt-2">Datos de sesiones y telemetría en tiempo real</p>
              </div>
            </div>

            <div
              onMouseEnter={(e) => handleRecordCardHover(e, true)}
              onMouseLeave={(e) => handleRecordCardHover(e, false)}
              className="glass-dark rounded-xl p-4 relative overflow-hidden group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <p className="text-white/60 text-sm mb-2">API Histórica</p>
                <a
                  href="http://ergast.com/mrd/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors text-lg flex items-center space-x-2"
                >
                  <span>Ergast F1 API</span>
                  <span className="animate-pulse">→</span>
                </a>
                <p className="text-white/50 text-xs mt-2">Clasificaciones y resultados históricos</p>
              </div>
            </div>

            <div className="glass-dark rounded-xl p-4">
              <p className="text-white/60 text-sm mb-2">Última actualización</p>
              <p className="text-white font-semibold">
                {new Date().toLocaleString('es-ES')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Final note */}
      <div
        ref={finalNoteRef}
        className="mt-10 glass-dark rounded-2xl p-6 text-center relative overflow-hidden"
        style={{ opacity: 0 }}
      >
        <div className="gradient-pulse absolute inset-0 bg-gradient-to-r from-f1-red/20 via-transparent to-f1-red/20 blur-xl" />
        <p className="text-white/60 text-sm relative z-10">
          <strong className="text-white">Nota:</strong> Los datos de puntos y clasificaciones
          son obtenidos en tiempo real de OpenF1 y Ergast F1 API.
        </p>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Estadisticas;
