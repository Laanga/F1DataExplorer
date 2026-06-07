import { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, Calendar, Users, Info } from 'lucide-react';
import gsap from 'gsap';
import { formatearFecha, isCarreraCompletada } from '../../utils/dateUtils';
import { getCompleteMeetingResults, categorizeSessionsByType } from '../../services/openf1Service';
import RaceSessionResults, { getSessionIcon, getSessionName } from './RaceSessionResults';

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

  const isCompleted = carrera ? isCarreraCompletada(carrera.date_end) : false;
  const circuitImageUrl = meeting?.circuit_image || '';
  const circuitDisplayName = meeting?.circuit_short_name || meeting?.location || meeting?.meeting_name || 'Circuito';
  const eventYear = carrera?.date_start ? new Date(carrera.date_start).getFullYear() : null;

  const loadMeetingData = useCallback(async () => {
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
  }, [carrera?.session_name, carrera?.session_type, meeting?.meeting_key]);

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
  }, [isOpen, meeting?.meeting_key, loadMeetingData]);

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

  useEffect(() => {
    if (!isOpen || !shouldRender) return undefined;

    const previousActiveElement = document.activeElement;
    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleEscape);
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [handleClose, isOpen, shouldRender]);

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

  if (!carrera || !shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        ref={backdropRef}
        onClick={handleClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-default"
        data-lenis-prevent
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
        aria-label="Cerrar detalle de carrera"
        style={{ opacity: 0 }}
      />

      <div
        className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto overscroll-contain p-4 sm:p-6 pointer-events-none"
        data-lenis-prevent
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
      >
        <div className="relative w-full max-w-5xl my-4 sm:my-8 pointer-events-auto" style={{ overflow: 'visible' }}>
          {/* Close button - floating above modal */}
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            onMouseEnter={(e) => handleCloseHover(e, true)}
            onMouseLeave={(e) => handleCloseHover(e, false)}
            className="absolute -top-4 -right-4 z-[60] p-2.5 border border-white/30 hover:border-white/50 transition-all duration-300 shadow-xl"
            aria-label="Cerrar detalle de carrera"
            style={{
              background: 'linear-gradient(135deg, rgba(255,85,61,0.94) 0%, rgba(190,14,0,0.94) 100%)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(225,6,0,0.4), 0 2px 8px rgba(0,0,0,0.5)'
            }}
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div
            ref={modalRef}
            className="glass glass-hover border border-white/20 shadow-glass w-full max-w-full max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden overscroll-contain"
            data-lenis-prevent
            data-lenis-prevent-wheel
            data-lenis-prevent-touch
            role="dialog"
            aria-modal="true"
            style={{
              opacity: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              background: 'linear-gradient(135deg, rgba(47,26,22,0.78) 0%, rgba(21,21,30,0.92) 100%)',
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
                  className={`w-10 h-10 flex items-center justify-center glass border border-white/20 shadow-glass ${isCompleted
                    ? 'bg-gradient-to-br from-green-500/30 to-green-600/30'
                    : 'bg-gradient-to-br from-blue-500/30 to-blue-600/30'
                    }`}
                >
                  <span className="text-xl font-bold text-white">
                    {carrera.session_name?.replace('Race', 'R') || 'R'}
                  </span>
                </div>

                <div className="flex-1">
                  <h2 className="text-2xl font-racing italic text-white mb-1">
                    {meeting?.meeting_name || carrera.session_name || 'Gran Premio'}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/60 text-xs">
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
                  <div className="w-12 h-12 border-4 border-f1-red/30 border-t-f1-copper rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-white font-medium mb-1">Cargando datos de la carrera…</p>
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
                      className={`px-6 py-3 text-sm font-mono uppercase tracking-[0.12em] glass border transition-all duration-300 ${isCompleted
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
                          className={`inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-mono uppercase tracking-[0.1em] transition-all duration-300 border ${showEventInfo
                            ? 'glass text-white border-white/20'
                            : 'text-white/80 glass-hover border-white/10 hover:text-white'
                            }`}
                        >
                          <Info className="w-3.5 h-3.5 text-white/90" />
                          <span>{showEventInfo ? 'Ocultar info del evento' : 'Mostrar info del evento'}</span>
                        </button>
                      </div>

                      {showEventInfo && (
                        <div className="glass glass-hover p-4 border border-white/10">
                          <div className="flex items-center space-x-2 mb-3">
                            <Users className="w-5 h-5 text-purple-400" />
                            <h3 className="font-semibold text-white text-sm">Información del Evento</h3>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-white/80 text-sm">
                            <div><span className="text-white/90">País:</span> {meeting.country_name || 'No disponible'}</div>
                            <div><span className="text-white/90">Circuito:</span> {meeting.circuit_short_name || meeting.location || 'No disponible'}</div>
                            <div><span className="text-white/90">Año:</span> {meeting.year || eventYear || 'No disponible'}</div>
                            {meeting.gmt_offset && <div><span className="text-white/90">Zona Horaria:</span> GMT{meeting.gmt_offset}</div>}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Tabs */}
                  <div className="glass p-1.5 border border-white/10">
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
                            className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 py-2 px-3 sm:py-3 sm:px-4 text-sm font-mono uppercase tracking-[0.08em] transition-all duration-300 ${activeTab === tab
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
                              <span className="glass text-xs px-2 py-0.5 border border-white/20">
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
                    <RaceSessionResults
                      sessionType={activeTab}
                      categorizedSessions={categorizedSessions}
                      meetingData={meetingData}
                      loadingMeeting={loadingMeeting}
                    />
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
