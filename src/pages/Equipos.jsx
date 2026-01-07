import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getChampionshipStandings, getDrivers } from '../services/openf1Service';
import Loader from '../components/ui/Loader';
import { Shield, Users, TrendingUp, Trophy } from 'lucide-react';
import { useYear } from '../contexts/YearContext';
import { getTeamLogo, getTeamColor, getDriverPhoto } from '../utils/formatUtils';
import { getDriverNationality } from '../utils/nationalityUtils';
import { useAsyncDataParallel } from '../hooks/useAsyncData';

gsap.registerPlugin(ScrollTrigger);

const Equipos = () => {
  const { selectedYear } = useYear();

  // Refs para animaciones
  const headerRef = useRef(null);
  const gridRef = useRef(null);
  const teamCardsRef = useRef([]);
  const noteRef = useRef(null);

  // Usar el hook personalizado para manejar las llamadas con cleanup
  const { data, loading, error } = useAsyncDataParallel([
    (signal) => getChampionshipStandings({ signal }),
    (signal) => getDrivers({ signal })
  ], []);

  const [standingsData, driversData = []] = data;

  // Procesar los datos solo cuando cambien
  const standings = useMemo(() => {
    if (!standingsData || !driversData) return null;

    const driversMap = new Map();
    const driversMapByName = new Map();

    driversData.forEach(driver => {
      if (driver.driver_number) {
        driversMap.set(String(driver.driver_number), driver);
      }
      if (driver.full_name) {
        driversMapByName.set(driver.full_name.toLowerCase(), driver);
      }
      if (driver.name_acronym) {
        driversMapByName.set(driver.name_acronym.toLowerCase(), driver);
      }
    });

    const equiposFormateados = standingsData.constructors.map(constructor => ({
      nombre: constructor.team_name,
      pilotos: constructor.drivers.map(driver => {
        let driverWithPhoto = driversMap.get(String(driver.driver_number));

        if (!driverWithPhoto) {
          driverWithPhoto = driversMapByName.get(driver.full_name?.toLowerCase()) ||
                           driversMapByName.get(driver.name_acronym?.toLowerCase());
        }

        return {
          driver_number: driver.driver_number,
          full_name: driver.full_name,
          name_acronym: driver.name_acronym,
          puntos: driver.points,
          team_name: constructor.team_name,
          team_colour: constructor.team_colour,
          country_code: driverWithPhoto?.country_code || '',
          headshot_url: driverWithPhoto?.headshot_url || null
        };
      }),
      color: constructor.team_colour || '#e10600',
      puntos: constructor.points
    }));

    return { constructors: equiposFormateados };
  }, [standingsData, driversData]);

  const equipos = useMemo(() => {
    return standings?.constructors || [];
  }, [standings]);

  // Animaciones de entrada
  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      // Header animation
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { opacity: 0, y: -30 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
        );

        const icon = headerRef.current.querySelector('.header-icon');
        const title = headerRef.current.querySelector('h1');
        const subtitle = headerRef.current.querySelector('p');

        if (icon) {
          gsap.fromTo(icon, { scale: 0, rotation: -180 }, { scale: 1, rotation: 0, duration: 0.6, delay: 0.2, ease: 'back.out(2)' });
        }
        if (title) {
          gsap.fromTo(title, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5, delay: 0.3, ease: 'power2.out' });
        }
        if (subtitle) {
          gsap.fromTo(subtitle, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.4, ease: 'power2.out' });
        }
      }

      // Grid animation
      if (gridRef.current) {
        gsap.fromTo(
          gridRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.5, delay: 0.5, ease: 'power2.out' }
        );
      }

      // Team cards stagger animation
      const validCards = teamCardsRef.current.filter(Boolean);
      if (validCards.length > 0) {
        gsap.fromTo(
          validCards,
          { opacity: 0, y: 50, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: 0.1,
            delay: 0.6,
            ease: 'power3.out',
          }
        );
      }

      // Note animation
      if (noteRef.current) {
        gsap.fromTo(
          noteRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, delay: 1, ease: 'power2.out' }
        );
      }
    });

    return () => ctx.revert();
  }, [loading, equipos.length]);

  // Hover handlers
  const handleCardHover = useCallback((e, isHovering, teamColor) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.05 : 1,
      y: isHovering ? -8 : 0,
      boxShadow: isHovering
        ? `0 20px 40px ${teamColor}60, 0 0 0 2px ${teamColor}80`
        : `0 8px 32px ${teamColor}60, 0 0 0 2px ${teamColor}80`,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleLogoHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.1 : 1,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleDriverHover = useCallback((e, isHovering, teamColor) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.05 : 1,
      x: isHovering ? 5 : 0,
      duration: 0.3,
      ease: 'power2.out'
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

  const handlePointsHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.1 : 1,
      duration: 0.2,
      ease: 'power2.out'
    });
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-x-hidden">
        <Loader mensaje="Cargando equipos..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-x-hidden">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-white/70">Error al cargar equipos: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-x-hidden">
      <div ref={headerRef} className="mb-10 relative" style={{ opacity: 0 }}>
        <div className="flex items-center space-x-3 sm:space-x-4 mb-4">
          <div className="header-icon w-12 h-12 rounded-xl bg-gradient-to-br from-f1-red to-red-700 flex items-center justify-center shadow-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Equipos
              <span className="text-f1-red font-bold ml-3">
                Temporada {selectedYear}
              </span>
            </h1>
            <p className="text-white/60 text-lg flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Análisis de constructores y sus pilotos</span>
            </p>
          </div>
        </div>
      </div>

      <div ref={gridRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ opacity: 0 }}>
        {equipos.map((equipo, index) => {
          const teamColor = getTeamColor(equipo.nombre);

          return (
            <div
              key={equipo.nombre}
              ref={(el) => (teamCardsRef.current[index] = el)}
              onMouseEnter={(e) => handleCardHover(e, true, teamColor)}
              onMouseLeave={(e) => handleCardHover(e, false, teamColor)}
              className="relative overflow-hidden rounded-2xl p-4 sm:p-6 border-2 transition-all duration-300 cursor-pointer"
              style={{
                opacity: 0,
                background: `linear-gradient(135deg, ${teamColor}60 0%, ${teamColor}40 50%, ${teamColor}50 100%)`,
                borderColor: teamColor,
                boxShadow: `0 8px 32px ${teamColor}60, 0 0 0 2px ${teamColor}80`
              }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div
                    onMouseEnter={(e) => handleLogoHover(e, true)}
                    onMouseLeave={(e) => handleLogoHover(e, false)}
                    className="flex items-center justify-center"
                  >
                    <img
                      src={getTeamLogo(equipo.nombre)}
                      alt={`Logo ${equipo.nombre}`}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain transition-transform duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'block';
                      }}
                    />
                    <Shield
                      className="w-10 h-10 sm:w-12 sm:h-12 text-white hidden"
                      style={{ display: 'none' }}
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {equipo.nombre}
                    </h2>
                    <p className="text-white/60 text-xs sm:text-sm flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>{equipo.pilotos.length} piloto{equipo.pilotos.length !== 1 ? 's' : ''}</span>
                    </p>
                  </div>
                </div>

                <div
                  onMouseEnter={(e) => handlePointsHover(e, true)}
                  onMouseLeave={(e) => handlePointsHover(e, false)}
                  className="text-right cursor-pointer"
                >
                  <div className="flex items-center space-x-1 justify-end mb-1">
                    <Trophy className="w-3 h-3 text-yellow-400" />
                    <p className="text-white/50 text-xs">Puntos</p>
                  </div>
                  <p
                    className="text-2xl sm:text-3xl font-bold"
                    style={{ color: teamColor }}
                  >
                    {equipo.puntos}
                  </p>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center space-x-2 text-white/70 text-sm mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-semibold">Pilotos del equipo</span>
                </div>

                {equipo.pilotos
                  .sort((a, b) => b.puntos - a.puntos)
                  .map((piloto, idx) => (
                    <div
                      key={piloto.driver_number || idx}
                      onMouseEnter={(e) => handleDriverHover(e, true, teamColor)}
                      onMouseLeave={(e) => handleDriverHover(e, false, teamColor)}
                      className="glass-dark rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 cursor-pointer border border-white/10 hover:border-white/20 transition-all duration-300"
                      style={{
                        background: `linear-gradient(90deg, ${teamColor}15 0%, transparent 100%)`
                      }}
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="relative">
                          {(() => {
                            const driverPhoto = getDriverPhoto(piloto);
                            return driverPhoto ? (
                              <div
                                onMouseEnter={(e) => handlePhotoHover(e, true)}
                                onMouseLeave={(e) => handlePhotoHover(e, false)}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden shadow-lg"
                              >
                                <img
                                  src={driverPhoto}
                                  alt={piloto.full_name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.parentElement.style.display = 'none';
                                    e.target.parentElement.nextElementSibling.style.display = 'flex';
                                  }}
                                />
                              </div>
                            ) : null;
                          })()}
                          <div
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center"
                            style={{
                              background: `linear-gradient(135deg, ${teamColor} 0%, ${teamColor}80 100%)`,
                              boxShadow: `0 4px 10px ${teamColor}40`,
                              display: getDriverPhoto(piloto) ? 'none' : 'flex'
                            }}
                          >
                            <span className="text-white font-bold text-sm">
                              {piloto.driver_number}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold">
                            {piloto.full_name}
                          </p>
                          <p className="text-white/50 text-xs">
                            {piloto.name_acronym} • {getDriverNationality(piloto)}
                          </p>
                        </div>
                      </div>

                      <div
                        onMouseEnter={(e) => handlePointsHover(e, true)}
                        onMouseLeave={(e) => handlePointsHover(e, false)}
                        className="text-right cursor-pointer"
                      >
                        <p className="text-white/50 text-xs">Pts</p>
                        <p
                          className="font-bold text-base sm:text-lg"
                          style={{ color: teamColor }}
                        >
                          {piloto.puntos}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Progress bar */}
              <div
                className="h-3 rounded-full mt-6 relative overflow-hidden"
                style={{
                  background: `linear-gradient(90deg, ${teamColor}90 0%, ${teamColor} 50%, transparent 100%)`,
                  boxShadow: `0 4px 15px ${teamColor}80`
                }}
              >
                <div
                  className="absolute inset-0 rounded-full animate-shimmer"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, ${teamColor} 50%, transparent 100%)`,
                    animation: 'shimmer 2s ease-in-out infinite'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        ref={noteRef}
        className="mt-10 glass-dark rounded-2xl p-4 sm:p-6 text-center"
        style={{ opacity: 0 }}
      >
        <p className="text-white/60 text-sm">
          <strong className="text-white">Datos actualizados:</strong> Los puntos mostrados son calculados en tiempo real
          basados en los resultados de las carreras de la temporada {selectedYear}.
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

export default Equipos;
