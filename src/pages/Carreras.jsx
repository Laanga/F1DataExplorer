import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getRaces, getMeetings, getCompleteMeetingResults } from '../services/openf1Service';
import Loader from '../components/ui/Loader';
import RaceModal from '../components/ui/RaceModal';
import { formatearFecha, isCarreraCompletada } from '../utils/dateUtils';
import { Flag, MapPin, Calendar, Trophy, CheckCircle2, Clock } from 'lucide-react';
import { useYear } from '../contexts/YearContext';
import { getTotalRacesForYear } from '../services/config/apiConfig';

gsap.registerPlugin(ScrollTrigger);

/**
 * Página de Carreras - Muestra las carreras de la temporada
 */
const Carreras = () => {
  const [carreras, setCarreras] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRace, setSelectedRace] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { selectedYear } = useYear();
  const prefetchedMeetingsRef = React.useRef(new Set());

  // Refs para animaciones
  const headerRef = useRef(null);
  const statsRef = useRef(null);
  const statsCardsRef = useRef([]);
  const upcomingRef = useRef(null);
  const upcomingItemsRef = useRef([]);
  const completedRef = useRef(null);
  const completedItemsRef = useRef([]);
  const clockIconRef = useRef(null);

  const openRaceModal = (carrera) => {
    setSelectedRace(carrera);
    setIsModalOpen(true);
  };

  const closeRaceModal = () => {
    setIsModalOpen(false);
    setSelectedRace(null);
  };

  const prefetchMeeting = async (meetingKey) => {
    if (!meetingKey) return;
    const setRef = prefetchedMeetingsRef.current;
    if (setRef.has(meetingKey)) return;
    setRef.add(meetingKey);
    try {
      await getCompleteMeetingResults(meetingKey);
    } catch (e) {
      console.warn('Prefetch meeting falló:', e?.message || e);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(null);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: La carga de datos tardó demasiado')), 30000)
        );

        const [carrerasData, meetingsData] = await Promise.race([
          Promise.all([
            getRaces({ signal }),
            getMeetings({ signal })
          ]),
          timeoutPromise
        ]);

        const carrerasFiltradas = carrerasData.filter(carrera => {
          const carreraYear = new Date(carrera.date_start).getFullYear();
          return carreraYear === selectedYear;
        });

        setCarreras(carrerasFiltradas || []);
        setMeetings(meetingsData || []);
      } catch (error) {
        console.error('❌ Error al cargar datos de carreras:', error);
        setError(error.message || 'Error al cargar los datos');

        try {
          const carrerasBasicas = await getRaces({ signal });
          const carrerasFiltradas = carrerasBasicas.filter(carrera => {
            const carreraYear = new Date(carrera.date_start).getFullYear();
            return carreraYear === selectedYear;
          });
          setCarreras(carrerasFiltradas || []);
          setMeetings([]);
          setError('Algunos datos pueden estar incompletos');
        } catch (fallbackError) {
          console.error('❌ Error en fallback:', fallbackError);
          setCarreras([]);
          setMeetings([]);
        }
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();

    return () => {
      controller.abort();
    };
  }, []);

  // Animaciones de entrada
  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      // Header animation
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { opacity: 0, y: -20 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
        );
      }

      // Stats cards animation
      if (statsRef.current) {
        gsap.fromTo(
          statsRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, delay: 0.2, ease: 'power2.out' }
        );

        const validStats = statsCardsRef.current.filter(Boolean);
        if (validStats.length > 0) {
          validStats.forEach((card, index) => {
            gsap.fromTo(
              card,
              { opacity: 0, scale: 0 },
              { opacity: 1, scale: 1, duration: 0.5, delay: 0.4 + index * 0.1, ease: 'back.out(1.5)' }
            );
          });
        }
      }

      // Clock icon rotation animation
      if (clockIconRef.current) {
        gsap.to(clockIconRef.current, {
          rotation: 360,
          duration: 2,
          repeat: -1,
          ease: 'none'
        });
      }

      // Upcoming races animation
      if (upcomingRef.current) {
        gsap.fromTo(
          upcomingRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, delay: 0.4, ease: 'power2.out' }
        );

        const validItems = upcomingItemsRef.current.filter(Boolean);
        if (validItems.length > 0) {
          gsap.fromTo(
            validItems,
            { opacity: 0, x: -20 },
            { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, delay: 0.5, ease: 'power2.out' }
          );
        }
      }

      // Completed races animation
      if (completedRef.current) {
        gsap.fromTo(
          completedRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, delay: 0.6, ease: 'power2.out' }
        );

        const validItems = completedItemsRef.current.filter(Boolean);
        if (validItems.length > 0) {
          gsap.fromTo(
            validItems,
            { opacity: 0, x: -20 },
            { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, delay: 0.7, ease: 'power2.out' }
          );
        }
      }
    });

    return () => ctx.revert();
  }, [loading, carreras.length]);

  // Hover handlers
  const handleStatHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.02 : 1,
      y: isHovering ? -5 : 0,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleIconHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      rotation: isHovering ? 360 : 0,
      scale: isHovering ? 1.2 : 1,
      duration: 0.6,
      ease: 'power2.out'
    });
  }, []);

  const handleRaceItemHover = useCallback((e, isHovering, color = 'rgba(255, 255, 255, 0.08)') => {
    gsap.to(e.currentTarget, {
      backgroundColor: isHovering ? color : 'transparent',
      scale: isHovering ? 1.01 : 1,
      x: isHovering ? 5 : 0,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleBadgeHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.1 : 1,
      rotation: isHovering ? 5 : 0,
      boxShadow: isHovering ? '0 20px 25px -5px rgba(220, 38, 38, 0.4)' : 'none',
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  // Separar carreras
  const carrerasCompletadas = carreras.filter(c => isCarreraCompletada(c.date_end));
  const proximasCarreras = carreras.filter(c => !isCarreraCompletada(c.date_end));

  if (loading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-x-hidden">
        <Loader mensaje="Cargando carreras..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-x-hidden">
      {/* Header */}
      <div ref={headerRef} className="mb-10" style={{ opacity: 0 }}>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
          Carreras
          <span className="text-f1-red font-bold ml-3">Temporada {selectedYear}</span>
        </h1>
        <p className="text-white/60 text-lg">
          Calendario y resultados de la temporada
        </p>
      </div>

      {/* Error indicator */}
      {error && (
        <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Advertencia:</span>
            <span className="ml-1">{error}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10" style={{ opacity: 0 }}>
        <div
          ref={el => statsCardsRef.current[0] = el}
          onMouseEnter={(e) => handleStatHover(e, true)}
          onMouseLeave={(e) => handleStatHover(e, false)}
          className="glass glass-hover rounded-2xl p-4 sm:p-6 group cursor-pointer"
          style={{ opacity: 0 }}
        >
          <div className="flex items-center space-x-3 mb-2">
            <div onMouseEnter={(e) => handleIconHover(e, true)} onMouseLeave={(e) => handleIconHover(e, false)}>
              <Flag className="w-6 h-6 text-f1-red" />
            </div>
            <p className="text-white/60 text-sm">Total de Carreras</p>
          </div>
          <p className="text-4xl font-bold text-white">
            {carrerasCompletadas.length} / {getTotalRacesForYear(selectedYear)}
          </p>
          <p className="text-white/40 text-xs mt-1">Disputadas / Total temporada</p>
        </div>

        <div
          ref={el => statsCardsRef.current[1] = el}
          onMouseEnter={(e) => handleStatHover(e, true)}
          onMouseLeave={(e) => handleStatHover(e, false)}
          className="glass glass-hover rounded-2xl p-4 sm:p-6 group cursor-pointer"
          style={{ opacity: 0 }}
        >
          <div className="flex items-center space-x-3 mb-2">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <p className="text-white/60 text-sm">Completadas</p>
          </div>
          <p className="text-4xl font-bold text-white">{carrerasCompletadas.length}</p>
        </div>

        <div
          ref={el => statsCardsRef.current[2] = el}
          onMouseEnter={(e) => handleStatHover(e, true)}
          onMouseLeave={(e) => handleStatHover(e, false)}
          className="glass glass-hover rounded-2xl p-4 sm:p-6 group cursor-pointer"
          style={{ opacity: 0 }}
        >
          <div className="flex items-center space-x-3 mb-2">
            <div ref={clockIconRef}>
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-white/60 text-sm">Por Disputar</p>
          </div>
          <p className="text-4xl font-bold text-white">{proximasCarreras.length}</p>
        </div>
      </div>

      {/* Upcoming Races */}
      {proximasCarreras.length > 0 && (
        <div ref={upcomingRef} className="mb-10" style={{ opacity: 0 }}>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center space-x-2">
            <Clock className="w-6 h-6 text-blue-400" />
            <span>Próximas Carreras</span>
          </h2>

          <div className="glass rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/10">
              {proximasCarreras.map((carrera, index) => {
                const meeting = meetings.find(m => m.meeting_key === carrera.meeting_key);

                return (
                  <div
                    key={carrera.session_key || index}
                    ref={el => upcomingItemsRef.current[index] = el}
                    onClick={() => openRaceModal(carrera)}
                    onMouseEnter={(e) => {
                      handleRaceItemHover(e, true, 'rgba(59, 130, 246, 0.1)');
                      prefetchMeeting(meeting?.meeting_key || carrera.meeting_key);
                    }}
                    onMouseLeave={(e) => handleRaceItemHover(e, false)}
                    className="px-4 sm:px-6 py-4 sm:py-5 transition-all duration-300 cursor-pointer border-l-4 border-transparent hover:border-blue-400"
                    style={{ opacity: 0 }}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
                      <div className="flex items-start md:items-center space-x-3 sm:space-x-4 flex-1">
                        <div
                          onMouseEnter={(e) => handleBadgeHover(e, true)}
                          onMouseLeave={(e) => handleBadgeHover(e, false)}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20"
                        >
                          <span className="text-white font-bold text-base sm:text-lg">{index + 1}</span>
                        </div>

                        <div className="flex-1">
                          <h3 className="text-white font-bold text-base sm:text-lg mb-1 flex items-center space-x-2">
                            <span>{meeting?.meeting_name || 'Gran Premio'}</span>
                            <Clock className="w-5 h-5 text-blue-400" />
                          </h3>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4" />
                              <span>{meeting?.location || meeting?.country_name || 'Ubicación'}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4" />
                              <span>{formatearFecha(carrera.date_start)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="glass-dark px-3 sm:px-4 py-2 rounded-lg">
                          <p className="text-white/50 text-xs mb-1">Circuito</p>
                          <p className="text-white font-semibold text-sm">
                            {meeting?.circuit_short_name || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Completed Races */}
      {carrerasCompletadas.length > 0 && (
        <div ref={completedRef} className="glass rounded-2xl overflow-hidden" style={{ opacity: 0 }}>
          <div className="bg-white/5 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Carreras Completadas</span>
            </h2>
          </div>

          <div className="divide-y divide-white/10">
            {carrerasCompletadas.length === 0 ? (
              <div className="px-4 sm:px-6 py-10 sm:py-12 text-center text-white/50">
                Todavía no hay carreras completadas en {selectedYear}
              </div>
            ) : (
              carrerasCompletadas.map((carrera, index) => {
                const meeting = meetings.find(m => m.meeting_key === carrera.meeting_key);

                return (
                  <div
                    key={carrera.session_key || index}
                    ref={el => completedItemsRef.current[index] = el}
                    onClick={() => openRaceModal(carrera)}
                    onMouseEnter={(e) => {
                      handleRaceItemHover(e, true);
                      prefetchMeeting(meeting?.meeting_key || carrera.meeting_key);
                    }}
                    onMouseLeave={(e) => handleRaceItemHover(e, false)}
                    className="px-4 sm:px-6 py-4 sm:py-5 transition-all duration-300 cursor-pointer border-l-4 border-transparent hover:border-green-400"
                    style={{ opacity: 0 }}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
                      <div className="flex items-start md:items-center space-x-3 sm:space-x-4 flex-1">
                        <div
                          onMouseEnter={(e) => handleBadgeHover(e, true)}
                          onMouseLeave={(e) => handleBadgeHover(e, false)}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-f1 flex items-center justify-center flex-shrink-0 shadow-lg shadow-f1-red/20"
                        >
                          <span className="text-white font-bold text-base sm:text-lg">{index + 1}</span>
                        </div>

                        <div className="flex-1">
                          <h3 className="text-white font-bold text-base sm:text-lg mb-1 flex items-center space-x-2">
                            <span>{meeting?.meeting_name || carrera.session_name || 'Carrera'}</span>
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          </h3>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4" />
                              <span>{meeting?.location || meeting?.country_name || 'Ubicación'}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4" />
                              <span>{formatearFecha(carrera.date_start)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="glass-dark px-3 sm:px-4 py-2 rounded-lg">
                          <p className="text-white/50 text-xs mb-1">Circuito</p>
                          <p className="text-white font-semibold text-sm">
                            {meeting?.circuit_short_name || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {carreras.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Flag className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <p className="text-white/60 text-lg">
            No hay datos de carreras disponibles para {selectedYear}
          </p>
        </div>
      )}

      {/* Race Modal */}
      <RaceModal
        isOpen={isModalOpen}
        onClose={closeRaceModal}
        carrera={selectedRace}
        meeting={selectedRace ? meetings.find(m => m.meeting_key === selectedRace.meeting_key) : null}
      />
    </div>
  );
};

export default Carreras;
