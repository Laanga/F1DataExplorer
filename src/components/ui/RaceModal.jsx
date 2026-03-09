import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, Calendar, Clock, Trophy, Flag, Users, Timer, Medal, Activity, Zap, Target, Info } from 'lucide-react';
import gsap from 'gsap';
import { formatearFecha, formatearFechaHora, getTiempoRestante, isCarreraCompletada } from '../../utils/dateUtils';
import { getCompleteMeetingResults, categorizeSessionsByType } from '../../services/openf1Service';
import { getDriverPhoto } from '../../utils/formatUtils';
import { getTeamColor } from '../../utils/chartColors';

const LOADING_DOT_IDS = ['dot-a', 'dot-b', 'dot-c'];
const createEmptySessionGroups = () => ({
  practice: [],
  qualifying: [],
  sprint: [],
  race: []
});

const RaceModal = ({ isOpen, onClose, carrera, meeting }) => {
  const [meetingData, setMeetingData] = useState(null);
  const [loadingMeeting, setLoadingMeeting] = useState(false);
  const [activeTab, setActiveTab] = useState('race');
  const [circuitImageError, setCircuitImageError] = useState(false);
  const [categorizedSessions, setCategorizedSessions] = useState(createEmptySessionGroups);
  const [showEventInfo, setShowEventInfo] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Refs para animaciones
  const backdropRef = useRef(null);
  const modalRef = useRef(null);
  const headerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const contentRef = useRef(null);
  const loadingDotsRef = useRef([]);
  const resultItemsRef = useRef([]);

  const isCompleted = carrera ? isCarreraCompletada(carrera.date_end) : false;
  const circuitImageUrl = meeting?.circuit_image || '';
  const circuitDisplayName = meeting?.circuit_short_name || meeting?.location || meeting?.meeting_name || 'Circuito';

  const loadMeetingData = async () => {
    if (!meeting?.meeting_key) return;

    setLoadingMeeting(true);
    setMeetingData(null);
    setCategorizedSessions(createEmptySessionGroups());
    try {
      const data = await getCompleteMeetingResults(meeting.meeting_key);
      setMeetingData(data);

      const categorized = categorizeSessionsByType(data.session_list);
      setCategorizedSessions(categorized);

      const currentSessionType = (carrera?.session_name || carrera?.session_type || '').toLowerCase();
      if (currentSessionType.includes('practice') || currentSessionType.includes('free')) {
        setActiveTab('practice');
      } else if (currentSessionType.includes('qualifying')) {
        setActiveTab('qualifying');
      } else if (currentSessionType.includes('sprint')) {
        setActiveTab('sprint');
      } else {
        setActiveTab('race');
      }
    } catch (error) {
      console.error('Error al cargar datos del meeting:', error);
      setMeetingData(null);
    } finally {
      setLoadingMeeting(false);
    }
  };

  // Controlar renderizado
  useEffect(() => {
    if (isOpen && !shouldRender) {
      setShouldRender(true);
    }
  }, [isOpen, shouldRender]);

  // Cargar datos cuando se abre
  useEffect(() => {
    if (isOpen && meeting?.meeting_key) {
      loadMeetingData();
    }
  }, [isOpen, meeting?.meeting_key]);

  useEffect(() => {
    setCircuitImageError(false);
    setShowEventInfo(false);
  }, [meeting?.meeting_key]);

  // Animación de entrada
  useEffect(() => {
    if (!isOpen || !shouldRender || !backdropRef.current || !modalRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Backdrop
      tl.fromTo(backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );

      // Modal
      tl.fromTo(modalRef.current,
        { opacity: 0, scale: 0.9, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' },
        '-=0.2'
      );

      // Loading dots animation
      const validDots = loadingDotsRef.current.filter(Boolean);
      if (validDots.length > 0 && loadingMeeting) {
        validDots.forEach((dot, i) => {
          gsap.to(dot, {
            scale: 1.2,
            opacity: 1,
            duration: 0.5,
            repeat: -1,
            yoyo: true,
            delay: i * 0.2,
            ease: 'power1.inOut'
          });
        });
      }
    });

    return () => ctx.revert();
  }, [isOpen, shouldRender, loadingMeeting]);

  // Bloquear scroll de fondo y pausar Lenis para dejar scroll nativo al modal.
  useEffect(() => {
    if (!isOpen) return undefined;

    const lenisInstance = window?.__lenis || window?.lenis;
    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;

    lenisInstance?.stop?.();
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'contain';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      lenisInstance?.start?.();
      window.scrollTo({ top: scrollY, behavior: 'auto' });
    };
  }, [isOpen]);

  // Cerrar modal con animación
  const handleClose = useCallback(() => {
    if (!backdropRef.current || !modalRef.current) {
      onClose();
      setShouldRender(false);
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        onClose();
        setShouldRender(false);
      }
    });

    tl.to(modalRef.current, {
      opacity: 0,
      scale: 0.9,
      y: 20,
      duration: 0.3,
      ease: 'power2.in'
    });

    tl.to(backdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in'
    }, '-=0.1');
  }, [onClose]);

  // Hover handlers
  const handleCloseHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.1 : 1,
      rotation: isHovering ? 90 : 0,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleTabHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.02 : 1,
      duration: 0.2,
      ease: 'power2.out'
    });
  }, []);

  const getSessionIcon = (type) => {
    switch (type) {
      case 'practice': return <Activity className="w-4 h-4" />;
      case 'qualifying': return <Target className="w-4 h-4" />;
      case 'sprint': return <Zap className="w-4 h-4" />;
      case 'race': return <Trophy className="w-4 h-4" />;
      default: return <Flag className="w-4 h-4" />;
    }
  };

  const getSessionName = (type) => {
    switch (type) {
      case 'practice': return 'Entrenamientos Libres';
      case 'qualifying': return 'Clasificación';
      case 'sprint': return 'Sprint';
      case 'race': return 'Carrera';
      default: return 'Sesión';
    }
  };

  const renderSessionResults = (sessionType) => {
    const sessions = categorizedSessions[sessionType] || [];

    if (sessions.length === 0) {
      return (
        <div className="text-center py-8">
          <Flag className="w-12 h-12 text-white/40 mx-auto mb-3" />
          <p className="text-white/60">
            No hay sesiones de {getSessionName(sessionType).toLowerCase()} disponibles
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sessions.map((session, sessionIndex) => {
          const sessionResults = meetingData?.sessions[session.session_key]?.results || [];
          const sessionInfo = meetingData?.sessions[session.session_key]?.session_info || session;
          const typeTextForSession = String((sessionInfo.session_name || sessionInfo.session_type || sessionType || '')).toLowerCase();
          const showTimeColumn = /race|sprint/.test(typeTextForSession);

          return (
            <div key={session.session_key} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white flex items-center space-x-2">
                  {getSessionIcon(sessionType)}
                  <span>{sessionInfo.session_name || getSessionName(sessionType)}</span>
                </h4>
                <span className="text-white/60 text-sm">
                  {formatearFechaHora(sessionInfo.date_start)}
                </span>
              </div>

              {sessionResults.length > 0 ? (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  <div className="sticky top-0 z-10 grid grid-cols-12 gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm border-b border-white/10">
                    <div className="col-span-2 text-white/80 text-sm font-medium">Pos / Nº</div>
                    <div className="col-span-4 text-white/80 text-sm font-medium">Piloto</div>
                    <div className={`${showTimeColumn ? 'col-span-4' : 'col-span-6'} text-white/80 text-sm font-medium`}>Equipo</div>
                    {showTimeColumn && (
                      <div className="col-span-2 text-white/80 text-sm font-medium text-right">Tiempo / Gap</div>
                    )}
                  </div>

                  {sessionResults.map((result, index) => {
                    const pos = result.position || index + 1;
                    const teamName = result.driver_info?.team_name || 'Equipo no disponible';
                    const teamColor = getTeamColor(teamName);
                    const typeText = String((sessionInfo.session_name || sessionInfo.session_type || sessionType || '')).toLowerCase();
                    const isRaceLike = /race|sprint/.test(typeText);
                    const isPractice = /(practice|fp1|fp2|fp3|free practice)/.test(typeText);
                    const gapOrInterval = result.gap_to_leader || result.interval;
                    const lapOrTime = result.time || result.best_lap_time || result.duration;
                    const statusCandidates = [result.status, result.finish_status, result.classification, result.status_text, result.result];
                    const statusText = statusCandidates.find(Boolean);
                    const s = statusText ? String(statusText).toUpperCase() : '';
                    const posText = String(result.position_text || '').toUpperCase();

                    const timeOrGap = (() => {
                      if (s.includes('DNF') || s.includes('RETIRED') || s === 'R' || posText.includes('DNF') || posText === 'R' || posText.includes('RET')) return 'DNF';
                      if (s.includes('DNS') || posText.includes('DNS')) return 'DNS · No salió';
                      if (s.includes('DSQ') || s.includes('DQ') || s.includes('DISQUALIFIED') || posText.includes('DSQ')) return 'DSQ · Descalificado';
                      if (s.includes('NC') || s.includes('NOT CLASSIFIED') || posText.includes('NC')) return 'NC · No clasificado';
                      if (isPractice) return '—';
                      if (isRaceLike) {
                        if (pos === 1) return '-';
                        if (gapOrInterval) return gapOrInterval;
                        if (lapOrTime) return lapOrTime;
                        if (posText.includes('DNF') || posText === 'R' || posText.includes('RET')) return 'DNF';
                        return 'DNF';
                      }
                      if (lapOrTime) return lapOrTime;
                      return '—';
                    })();

                    const driverName = result.driver_info?.full_name || result.driver_info?.broadcast_name || `Piloto #${result.driver_number}`;

                    return (
                      <div
                        key={result.driver_number || index}
                        ref={(el) => (resultItemsRef.current[index] = el)}
                        className="grid grid-cols-12 gap-3 items-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        style={{ borderLeft: `4px solid ${teamColor}` }}
                      >
                        <div className="col-span-2 flex items-center space-x-3 px-4 py-3">
                          <div
                            className={`relative w-10 h-10 rounded-lg flex items-center justify-center text-sm font-extrabold shadow-lg border ${pos === 1
                              ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 text-black border-yellow-200/50 shadow-yellow-400/30'
                              : pos === 2
                                ? 'bg-gradient-to-br from-gray-300 via-gray-400 to-slate-500 text-black border-gray-200/50 shadow-gray-400/30'
                                : pos === 3
                                  ? 'bg-gradient-to-br from-amber-600 via-orange-500 to-amber-700 text-white border-amber-300/50 shadow-amber-500/30'
                                  : 'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 text-white border-slate-400/30 shadow-slate-600/20'
                              }`}
                          >
                            {pos}
                          </div>
                          <span className="text-white/80 text-sm">#{result.driver_number || '?'}</span>
                        </div>

                        <div className="col-span-4 flex items-center space-x-3 px-2 py-2">
                          <div className="relative">
                            <img
                              src={getDriverPhoto(result.driver_info) || '/drivers/default.png'}
                              alt={driverName}
                              className="w-9 h-9 rounded-full object-cover border-2 border-white/20"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                              }}
                            />
                            <div
                              className="w-9 h-9 rounded-full bg-gradient-to-r from-gray-600 to-gray-700 flex items-center justify-center text-white font-bold text-xs border-2 border-white/20"
                              style={{ display: 'none' }}
                            >
                              {result.driver_number || '?'}
                            </div>
                          </div>
                          <p className="text-white font-semibold text-base truncate">{driverName}</p>
                        </div>

                        <div className={`${showTimeColumn ? 'col-span-4' : 'col-span-6'} px-2 py-2`}>
                          <p className="text-white/80 text-base truncate">{teamName}</p>
                        </div>

                        {showTimeColumn && (
                          <div className="col-span-2 px-4 py-3 text-right">
                            <p className="text-white text-base font-semibold">{timeOrGap}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                </div>
              ) : loadingMeeting ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400 mx-auto" />
                  <p className="text-white/60 mt-2 text-sm">Cargando resultados...</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Flag className="w-6 h-6 text-white/40 mx-auto mb-2" />
                  <p className="text-white/60 text-sm">
                    No hay resultados disponibles para esta sesión
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (!carrera || !shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain p-4 sm:p-6"
        data-lenis-prevent
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
        style={{ opacity: 0 }}
      >
        <div className="relative w-full max-w-5xl my-4 sm:my-8" style={{ overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
          {/* Close button - floating above modal */}
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            onMouseEnter={(e) => handleCloseHover(e, true)}
            onMouseLeave={(e) => handleCloseHover(e, false)}
            className="absolute -top-4 -right-4 z-[60] p-2.5 rounded-full border border-white/30 hover:border-white/50 transition-all duration-300 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(225,6,0,0.9) 0%, rgba(185,28,28,0.9) 100%)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(225,6,0,0.4), 0 2px 8px rgba(0,0,0,0.5)'
            }}
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className="glass glass-hover rounded-3xl border border-white/20 shadow-glass w-full max-w-full max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden overscroll-contain"
            data-lenis-prevent
            data-lenis-prevent-wheel
            data-lenis-prevent-touch
            role="dialog"
            aria-modal="true"
            style={{
              opacity: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            }}
          >
            {/* Header */}
            <div ref={headerRef} className="relative p-4 sm:p-5 border-b border-white/10" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
            }}>
              <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap sm:space-x-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center glass border border-white/20 shadow-glass ${isCompleted
                    ? 'bg-gradient-to-br from-green-500/30 to-green-600/30'
                    : 'bg-gradient-to-br from-blue-500/30 to-blue-600/30'
                    }`}
                >
                  <span className="text-xl font-bold text-white">
                    {carrera.session_name?.replace('Race', 'R') || 'R'}
                  </span>
                </div>

                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white mb-1">
                    {meeting?.meeting_name || carrera.session_name || 'Gran Premio'}
                  </h2>
                  <div className="flex items-center space-x-2 text-white/60 text-xs">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{meeting?.location || 'Ubicación no disponible'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatearFecha(carrera.date_start)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div ref={contentRef} className="p-4 sm:p-6 space-y-6">
              {/* Loading */}
              {loadingMeeting && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-12 h-12 border-4 border-f1-red/30 border-t-f1-red rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-white font-medium mb-1">Cargando datos de la carrera...</p>
                    <p className="text-white/60 text-sm">Obteniendo información detallada del evento</p>
                  </div>
                  <div className="flex space-x-1">
                    {LOADING_DOT_IDS.map((dotId, index) => (
                      <div
                        key={dotId}
                        ref={(el) => (loadingDotsRef.current[index] = el)}
                        className="w-2 h-2 bg-f1-red rounded-full"
                        style={{ opacity: 0.5 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Content when loaded */}
              {!loadingMeeting && (
                <>
                  {/* Status Badge */}
                  <div className="flex justify-center">
                    <div
                      className={`px-6 py-3 rounded-2xl text-sm font-medium glass border transition-all duration-300 ${isCompleted
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}
                    >
                      {isCompleted ? '✅ Evento Completado' : '🏁 Próximo Evento'}
                    </div>
                  </div>

                  {/* Circuit shape */}
                  {meeting && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-white text-sm">Mapa del circuito</h3>
                        <span className="text-xs text-white/60 truncate">{circuitDisplayName}</span>
                      </div>

                      {circuitImageUrl && !circuitImageError ? (
                        <img
                          src={circuitImageUrl}
                          alt={`Mapa de ${circuitDisplayName}`}
                          className="w-full max-h-52 sm:max-h-60 object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                          loading="lazy"
                          onError={() => setCircuitImageError(true)}
                        />
                      ) : (
                        <div className="text-sm text-white/70">
                          El trazado del circuito no está disponible para este evento en la fuente actual.
                        </div>
                      )}

                    </div>
                  )}

                  {/* Event Info Toggle */}
                  {meeting && (
                    <>
                      <div className="flex justify-end">
                        <button
                          onClick={() => setShowEventInfo(v => !v)}
                          onMouseEnter={(e) => handleTabHover(e, true)}
                          onMouseLeave={(e) => handleTabHover(e, false)}
                          className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border ${showEventInfo
                            ? 'glass text-white border-white/20'
                            : 'text-white/80 glass-hover border-white/10 hover:text-white'
                            }`}
                        >
                          <Info className="w-3.5 h-3.5 text-white/90" />
                          <span>{showEventInfo ? 'Ocultar info del evento' : 'Mostrar info del evento'}</span>
                        </button>
                      </div>

                      {showEventInfo && (
                        <div className="glass glass-hover rounded-2xl p-4 border border-white/10">
                          <div className="flex items-center space-x-2 mb-3">
                            <Users className="w-5 h-5 text-purple-400" />
                            <h3 className="font-semibold text-white text-sm">Información del Evento</h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-white/80 text-sm">
                            <div><span className="text-white/90">País:</span> {meeting.country_name || 'No disponible'}</div>
                            <div><span className="text-white/90">Circuito:</span> {meeting.circuit_short_name || meeting.location || 'No disponible'}</div>
                            <div><span className="text-white/90">Año:</span> {meeting.year || new Date(carrera.date_start).getFullYear()}</div>
                            {meeting.gmt_offset && <div><span className="text-white/90">Zona Horaria:</span> GMT{meeting.gmt_offset}</div>}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Tabs */}
                  <div className="glass rounded-2xl p-1.5 border border-white/10">
                    <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:space-x-2">
                      {['practice', 'qualifying', 'sprint', 'race'].map((tab) => {
                        const hasData = categorizedSessions[tab]?.length > 0;
                        return (
                          <button
                            key={tab}
                            onClick={() => hasData && setActiveTab(tab)}
                            onMouseEnter={(e) => hasData && handleTabHover(e, true)}
                            onMouseLeave={(e) => hasData && handleTabHover(e, false)}
                            disabled={!hasData}
                            className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 py-2 px-3 sm:py-3 sm:px-4 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === tab
                              ? 'glass text-white shadow-glass border border-white/20'
                              : hasData
                                ? 'text-white/70 hover:text-white hover:glass hover:border-white/10'
                                : 'text-white/30 cursor-not-allowed'
                              }`}
                            style={activeTab === tab ? {
                              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(147, 51, 234, 0.3) 100%)'
                            } : {}}
                          >
                            {getSessionIcon(tab)}
                            <span className="text-sm">{getSessionName(tab)}</span>
                            {hasData && (
                              <span className="glass text-xs px-2 py-0.5 rounded-full border border-white/20">
                                {categorizedSessions[tab].length}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Session Results */}
                  <div className="min-h-[300px]">
                    {renderSessionResults(activeTab)}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RaceModal;
