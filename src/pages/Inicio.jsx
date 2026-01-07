import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Trophy, Timer, TrendingUp, ChevronDown, Zap, Calendar, Users, Shield, Github } from 'lucide-react';
import { getSeasonProgress, getDriverStandings, getDrivers } from '../services/openf1Service';
import { useYear } from '../contexts/YearContext';
import { getDriverPhoto } from '../utils/formatUtils';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Inicio = () => {
  const navigate = useNavigate();
  const { selectedYear } = useYear();
  const [seasonProgress, setSeasonProgress] = useState(null);
  const [topDrivers, setTopDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Refs para animaciones
  const heroRef = useRef(null);
  const badgeRef = useRef(null);
  const statsRef = useRef(null);
  const driversRef = useRef(null);
  const featuresRef = useRef(null);
  const progressBarRef = useRef(null);
  const speedLinesRef = useRef([]);
  const ctaButtonRef = useRef(null);
  const ctaShimmerRef = useRef(null);
  const footerRef = useRef(null);

  const repoUrl = 'https://github.com/Laanga/F1DataExplorer';

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        const [progress, standings, drivers] = await Promise.all([
          getSeasonProgress(),
          getDriverStandings({ signal: controller.signal }),
          getDrivers({ signal: controller.signal })
        ]);
        
        if (!controller.signal.aborted) {
          setSeasonProgress(progress);
          
          const top3WithPhotos = standings.slice(0, 3).map(standing => {
            const driverData = drivers.find(d => 
              d.driver_number?.toString() === standing.driver?.permanentNumber?.toString() ||
              d.name_acronym?.toLowerCase() === standing.driver?.code?.toLowerCase()
            );
            
            return {
              ...standing,
              headshot_url: driverData?.headshot_url,
              driver_data: driverData
            };
          });
          
          setTopDrivers(top3WithPhotos);
        }
      } catch (error) {
        if (error.name !== 'AbortError' && !controller.signal.aborted) {
          console.error('Error al obtener datos:', error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => controller.abort();
  }, []);

  // Animaciones GSAP
  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      // Speed lines animation
      speedLinesRef.current.forEach((line, i) => {
        if (!line) return;
        gsap.to(line, {
          x: '300%',
          opacity: 0,
          duration: Math.random() * 2 + 1,
          repeat: -1,
          delay: Math.random() * 2,
          ease: 'none'
        });
      });

      // Badge animation
      if (badgeRef.current) {
        gsap.fromTo(badgeRef.current,
          { scale: 0, rotation: -180 },
          { scale: 1, rotation: 0, duration: 0.8, delay: 0.3, ease: 'back.out(2)' }
        );
      }

      // Hero animation
      if (heroRef.current) {
        gsap.fromTo(heroRef.current,
          { opacity: 0, y: 100 },
          { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', delay: 0.2 }
        );
      }

      // CTA shimmer
      if (ctaShimmerRef.current) {
        gsap.to(ctaShimmerRef.current, {
          x: '200%',
          duration: 2,
          repeat: -1,
          ease: 'none'
        });
      }

      // Progress bar
      if (progressBarRef.current && seasonProgress) {
        gsap.fromTo(progressBarRef.current,
          { width: 0 },
          { width: `${seasonProgress.progressPercentage}%`, duration: 1.5, delay: 1, ease: 'power2.out' }
        );
      }

      // Stats stagger
      if (statsRef.current) {
        gsap.fromTo(
          statsRef.current.children,
          { opacity: 0, y: 50, scale: 0.8 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: 0.8, stagger: 0.15, ease: 'back.out(1.7)',
            scrollTrigger: { trigger: statsRef.current, start: 'top 80%' }
          }
        );
      }

      // Drivers podium
      if (driversRef.current && topDrivers.length > 0) {
        gsap.fromTo(
          driversRef.current.children,
          { opacity: 0, y: 100, rotateX: -30 },
          {
            opacity: 1, y: 0, rotateX: 0,
            duration: 1, stagger: 0.2, ease: 'power3.out',
            scrollTrigger: { trigger: driversRef.current, start: 'top 80%' }
          }
        );
      }

      // Features
      if (featuresRef.current) {
        gsap.fromTo(
          featuresRef.current.children,
          { opacity: 0, scale: 0, rotation: -180 },
          {
            opacity: 1, scale: 1, rotation: 0,
            duration: 0.8, stagger: 0.1, ease: 'elastic.out(1, 0.5)',
            scrollTrigger: { trigger: featuresRef.current, start: 'top 80%' }
          }
        );
      }
    });

    return () => ctx.revert();
  }, [loading, topDrivers, seasonProgress]);

  // Hover handlers
  const handleCardHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      y: isHovering ? -10 : 0,
      scale: isHovering ? 1.02 : 1,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleDriverCardHover = useCallback((e, isHovering, isMain = false) => {
    gsap.to(e.currentTarget, {
      y: isHovering ? (isMain ? -15 : -10) : 0,
      scale: isHovering ? (isMain ? 1.05 : 1.02) : 1,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleButtonHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.05 : 1,
      boxShadow: isHovering ? '0 20px 40px rgba(239, 68, 68, 0.4)' : '0 10px 25px rgba(239, 68, 68, 0.3)',
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleButtonTap = useCallback((e) => {
    gsap.to(e.currentTarget, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });
  }, []);

  const handleFeatureHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      y: isHovering ? -10 : 0,
      scale: isHovering ? 1.05 : 1,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const quickAccess = [
    { title: 'Pilotos', description: 'Clasificación y perfiles de pilotos', icon: Users, color: '#ef4444', path: '/pilotos', gradient: 'from-red-500 to-red-700' },
    { title: 'Equipos', description: 'Datos de constructores y equipos', icon: Shield, color: '#3b82f6', path: '/equipos', gradient: 'from-blue-500 to-blue-700' },
    { title: 'Carreras', description: 'Calendario y resultados de carrera', icon: Flag, color: '#10b981', path: '/carreras', gradient: 'from-green-500 to-green-700' },
    { title: 'Estadísticas', description: 'Visualizaciones del campeonato', icon: TrendingUp, color: '#f59e0b', path: '/estadisticas', gradient: 'from-amber-500 to-amber-700' }
  ];

  return (
    <div className="min-h-screen overflow-x-hidden flex flex-col">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              ref={el => speedLinesRef.current[i] = el}
              className="absolute h-px bg-gradient-to-r from-transparent via-f1-red to-transparent"
              style={{
                top: `${Math.random() * 100}%`,
                left: '-100%',
                width: `${Math.random() * 300 + 100}px`,
                opacity: 0
              }}
            />
          ))}
        </div>

        <div className="max-w-6xl mx-auto w-full relative z-10" ref={heroRef} style={{ opacity: 0 }}>
          {/* Badge */}
          <div ref={badgeRef} className="flex justify-center mb-8" style={{ transform: 'scale(0)' }}>
            <div className="glass rounded-full px-6 py-3 inline-flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-f1-red" />
                <span className="text-white font-semibold">Temporada {selectedYear}</span>
              </div>
              <div className="w-px h-6 bg-white/20" />
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-f1-red rounded-full animate-pulse" />
                <span className="text-white/70">En vivo</span>
              </div>
              {!loading && seasonProgress && seasonProgress.totalRaces > 0 && (
                <>
                  <div className="w-px h-6 bg-white/20" />
                  <span className="text-white/70">
                    {seasonProgress.completedRaces}/{seasonProgress.totalRaces} Carreras
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white mb-6 leading-none">
              <span className="block">F1</span>
              <span className="block bg-gradient-to-r from-f1-red via-red-500 to-f1-red bg-clip-text text-transparent animate-pulse">
                DATA
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed">
              Consulta datos en tiempo real de la Fórmula 1. Clasificaciones, estadísticas 
              y toda la información del campeonato en un solo lugar.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button
              ref={ctaButtonRef}
              onMouseEnter={(e) => handleButtonHover(e, true)}
              onMouseLeave={(e) => handleButtonHover(e, false)}
              onClick={(e) => { handleButtonTap(e); navigate('/pilotos'); }}
              className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-f1-red to-red-700 text-white font-bold text-lg shadow-2xl overflow-hidden"
            >
              <div
                ref={ctaShimmerRef}
                className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                style={{ transform: 'translateX(-100%)' }}
              />
              <span className="relative flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Ver Datos</span>
              </span>
            </button>

            <button
              onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.05, duration: 0.3 })}
              onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.3 })}
              onClick={() => document.getElementById('stats-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-2xl glass glass-hover text-white font-semibold text-lg flex items-center space-x-2"
            >
              <span>Ver Más</span>
              <ChevronDown className="w-5 h-5 animate-bounce" />
            </button>
          </div>

          {/* Progress */}
          {!loading && seasonProgress && (
            <div className="max-w-2xl mx-auto">
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/70 text-sm font-semibold">Progreso del Campeonato</span>
                  <span className="text-f1-red font-bold">{seasonProgress.progressPercentage}%</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    ref={progressBarRef}
                    className="h-full bg-gradient-to-r from-f1-red to-red-500 rounded-full relative overflow-hidden"
                    style={{ width: 0 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats-section" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Temporada {selectedYear} en Números
            </h2>
            <p className="text-white/60 text-lg">Datos actualizados en tiempo real</p>
          </div>

          <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Flag, color: 'f1-red', value: seasonProgress?.totalRaces || 24, label: 'Carreras Totales', gradient: 'from-f1-red/20' },
              { icon: Trophy, color: 'green-400', value: seasonProgress?.completedRaces || 0, label: 'Completadas', gradient: 'from-green-500/20' },
              { icon: Users, color: 'blue-400', value: 20, label: 'Pilotos Activos', gradient: 'from-blue-500/20' },
              { icon: Shield, color: 'purple-400', value: 10, label: 'Equipos', gradient: 'from-purple-500/20' }
            ].map((stat, i) => (
              <div
                key={i}
                onMouseEnter={(e) => handleCardHover(e, true)}
                onMouseLeave={(e) => handleCardHover(e, false)}
                className="glass glass-hover rounded-2xl p-6 text-center relative overflow-hidden group cursor-pointer"
                style={{ opacity: 0 }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <stat.icon className={`w-12 h-12 mx-auto mb-4 text-${stat.color}`} />
                <p className="text-4xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-white/60 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Podium */}
      {!loading && topDrivers.length > 0 && (
        <section className="py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-f1-red/5 to-transparent pointer-events-none" />
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Top 3 del Campeonato</h2>
              <p className="text-white/60 text-lg">Los líderes actuales de la temporada</p>
            </div>

            <div ref={driversRef} className="flex flex-col md:flex-row items-end justify-center gap-6 px-4">
              {/* 2nd place */}
              {topDrivers[1] && (
                <div
                  onMouseEnter={(e) => handleDriverCardHover(e, true)}
                  onMouseLeave={(e) => handleDriverCardHover(e, false)}
                  className="glass glass-hover rounded-2xl p-6 w-full md:w-64 order-2 md:order-1 cursor-pointer"
                  style={{ opacity: 0 }}
                >
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 relative">
                      <div className="w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-gray-300 to-gray-500 shadow-2xl border-4 border-gray-400">
                        {(topDrivers[1].headshot_url || getDriverPhoto(topDrivers[1].driver_data)) ? (
                          <img 
                            src={topDrivers[1].headshot_url || getDriverPhoto(topDrivers[1].driver_data)} 
                            alt={`${topDrivers[1].driver?.givenName} ${topDrivers[1].driver?.familyName}`}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-4xl font-black text-white">2</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-xl border-2 border-white">
                        <span className="text-lg font-black text-white">2</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {topDrivers[1].driver?.givenName} {topDrivers[1].driver?.familyName}
                    </h3>
                    <p className="text-white/60 text-sm mb-4">{topDrivers[1].constructor?.name}</p>
                    <div className="glass-dark rounded-xl p-3 mb-3">
                      <p className="text-3xl font-bold text-white">{topDrivers[1].points}</p>
                      <p className="text-white/60 text-xs">Puntos</p>
                    </div>
                    <p className="text-gray-300 font-bold text-lg">{topDrivers[1].wins || 0} <span className="text-white/60 text-xs">Victorias</span></p>
                  </div>
                </div>
              )}

              {/* 1st place */}
              {topDrivers[0] && (
                <div
                  onMouseEnter={(e) => handleDriverCardHover(e, true, true)}
                  onMouseLeave={(e) => handleDriverCardHover(e, false, true)}
                  className="glass glass-hover rounded-2xl p-8 w-full md:w-80 order-1 md:order-2 relative overflow-hidden cursor-pointer"
                  style={{ opacity: 0 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-transparent to-transparent" />
                  <div className="text-center relative z-10">
                    <div className="w-32 h-32 mx-auto mb-4 relative">
                      <div className="w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-2xl border-4 border-yellow-400">
                        {(topDrivers[0].headshot_url || getDriverPhoto(topDrivers[0].driver_data)) ? (
                          <img 
                            src={topDrivers[0].headshot_url || getDriverPhoto(topDrivers[0].driver_data)} 
                            alt={`${topDrivers[0].driver?.givenName} ${topDrivers[0].driver?.familyName}`}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Trophy className="w-16 h-16 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-2xl shadow-yellow-400/50 border-2 border-white">
                        <Trophy className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {topDrivers[0].driver?.givenName} {topDrivers[0].driver?.familyName}
                    </h3>
                    <p className="text-white/60 mb-4">{topDrivers[0].constructor?.name}</p>
                    <div className="glass-dark rounded-xl p-4">
                      <p className="text-4xl font-black text-yellow-400 mb-1">{topDrivers[0].points}</p>
                      <p className="text-white/60 text-sm">Puntos</p>
                    </div>
                    <p className="mt-4 text-green-400 font-bold">{topDrivers[0].wins || 0} <span className="text-white/60 text-xs">Victorias</span></p>
                  </div>
                </div>
              )}

              {/* 3rd place */}
              {topDrivers[2] && (
                <div
                  onMouseEnter={(e) => handleDriverCardHover(e, true)}
                  onMouseLeave={(e) => handleDriverCardHover(e, false)}
                  className="glass glass-hover rounded-2xl p-6 w-full md:w-64 order-3 cursor-pointer"
                  style={{ opacity: 0 }}
                >
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 relative">
                      <div className="w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-amber-600 to-amber-800 shadow-2xl border-4 border-amber-600">
                        {(topDrivers[2].headshot_url || getDriverPhoto(topDrivers[2].driver_data)) ? (
                          <img 
                            src={topDrivers[2].headshot_url || getDriverPhoto(topDrivers[2].driver_data)} 
                            alt={`${topDrivers[2].driver?.givenName} ${topDrivers[2].driver?.familyName}`}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-4xl font-black text-white">3</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-xl border-2 border-white">
                        <span className="text-lg font-black text-white">3</span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {topDrivers[2].driver?.givenName} {topDrivers[2].driver?.familyName}
                    </h3>
                    <p className="text-white/60 text-sm mb-4">{topDrivers[2].constructor?.name}</p>
                    <div className="glass-dark rounded-xl p-3 mb-3">
                      <p className="text-3xl font-bold text-white">{topDrivers[2].points}</p>
                      <p className="text-white/60 text-xs">Puntos</p>
                    </div>
                    <p className="text-amber-400 font-bold text-lg">{topDrivers[2].wins || 0} <span className="text-white/60 text-xs">Victorias</span></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Quick Access */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Explora los Datos</h2>
            <p className="text-white/60 text-lg">Accede rápidamente a cada sección</p>
          </div>

          <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickAccess.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  onMouseEnter={(e) => handleFeatureHover(e, true)}
                  onMouseLeave={(e) => handleFeatureHover(e, false)}
                  onClick={() => navigate(item.path)}
                  className="glass glass-hover rounded-2xl p-6 cursor-pointer group relative overflow-hidden"
                  style={{ opacity: 0 }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />
                  
                  <div className="relative z-10">
                    <div 
                      className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center shadow-2xl"
                      style={{ 
                        background: `linear-gradient(135deg, ${item.color}20, ${item.color}40)`,
                        boxShadow: `0 8px 20px ${item.color}40`
                      }}
                    >
                      <Icon className="w-8 h-8" style={{ color: item.color }} />
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-white/60 text-sm mb-4">{item.description}</p>
                    
                    <div className="flex items-center text-sm font-semibold group-hover:gap-2 transition-all">
                      <span style={{ color: item.color }}>Ver más</span>
                      <ChevronDown className="w-4 h-4 -rotate-90 group-hover:translate-x-1 transition-transform" style={{ color: item.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div
            onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.02, duration: 0.3 })}
            onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.3 })}
            className="glass rounded-3xl p-12 text-center relative overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-f1-red/20 via-transparent to-transparent" />
            
            <div className="relative z-10">
              <Timer className="w-16 h-16 mx-auto mb-6 text-f1-red" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                ¿Listo para Explorar los Datos?
              </h2>
              <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
                Consulta estadísticas detalladas, clasificaciones actualizadas y sigue el campeonato en tiempo real
              </p>
              <button
                onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.05, duration: 0.3 })}
                onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.3 })}
                onClick={() => navigate('/estadisticas')}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-f1-red to-red-700 text-white font-bold text-lg shadow-2xl shadow-f1-red/30"
              >
                Ver Clasificación
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer ref={footerRef} className="mt-auto px-4 py-8 border-t border-white/10 bg-black/20">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ver repositorio en GitHub"
            onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.03, duration: 0.3 })}
            onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.3 })}
            className="group inline-flex items-center gap-3 px-5 py-3 rounded-2xl glass glass-hover text-white/90 hover:text-white"
          >
            <Github className="w-6 h-6 text-white group-hover:text-f1-red transition-colors" />
            <span className="font-semibold">Ver repositorio en GitHub</span>
          </a>
        </div>
      </footer>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Inicio;
