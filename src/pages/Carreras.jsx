import { useState, useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getRaces, getMeetings, getCompleteMeetingResults } from '../services/openf1Service';
import Loader from '../components/ui/Loader';
import RaceModal from '../components/ui/RaceModal';
import { formatearFecha, isCarreraCompletada } from '../utils/dateUtils';
import { Flag, MapPin, Calendar, CheckCircle2, Clock, ChevronDown } from 'lucide-react';
import { useYear } from '../contexts/YearContext';
import { getTotalRacesForYear } from '../services/config/apiConfig';

gsap.registerPlugin(ScrollTrigger);

const normalizeText = (value) => (
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
);

const getDayKey = (dateValue) => {
  if (!dateValue) return '';
  if (typeof dateValue === 'string') {
    const rawDateMatch = dateValue.match(/^(\d{4}-\d{2}-\d{2})/);
    if (rawDateMatch?.[1]) return rawDateMatch[1];
  }
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return '';
  return parsedDate.toISOString().slice(0, 10);
};

const preferOpenF1Source = (currentItem, nextItem) => {
  if (!currentItem) return nextItem;
  const currentIsErgast = currentItem?.source === 'ergast';
  const nextIsErgast = nextItem?.source === 'ergast';
  if (currentIsErgast && !nextIsErgast) return nextItem;
  return currentItem;
};

const dedupeByKey = (items, buildKey) => {
  const map = new Map();
  items.forEach((item) => {
    const key = buildKey(item);
    const existing = map.get(key);
    map.set(key, preferOpenF1Source(existing, item));
  });
  return Array.from(map.values());
};

const buildRaceListKey = (race) => {
  const dayKey = getDayKey(race?.date_start || race?.date_end);
  const round = Number.parseInt(race?.round, 10);
  const nameKey = normalizeText(race?.race_name || race?.meeting_name || race?.circuit_short_name || race?.location || race?.country_name);
  if (dayKey) return `day:${dayKey}`;
  if (Number.isFinite(round) && nameKey) return `round:${round}|name:${nameKey}`;
  if (Number.isFinite(round)) return `round:${round}`;
  if (nameKey) return `name:${nameKey}`;
  return `session:${race?.session_key || race?.meeting_key || 'unknown'}`;
};

const buildMeetingListKey = (meeting) => {
  const dayKey = getDayKey(meeting?.date_end || meeting?.date_start);
  const round = Number.parseInt(meeting?.round, 10);
  const nameKey = normalizeText(meeting?.meeting_name || meeting?.meeting_official_name || meeting?.circuit_short_name || meeting?.location);
  if (dayKey) return `day:${dayKey}`;
  if (Number.isFinite(round) && nameKey) return `round:${round}|name:${nameKey}`;
  if (Number.isFinite(round)) return `round:${round}`;
  if (nameKey) return `name:${nameKey}`;
  return `meeting:${meeting?.meeting_key || 'unknown'}`;
};

const getRoundNumber = (race, index) => {
  const parsedRound = Number.parseInt(race?.round, 10);
  return Number.isFinite(parsedRound) && parsedRound > 0 ? parsedRound : index + 1;
};

const getRoundAnchorId = (roundNumber, index) => `round-${roundNumber}-${index + 1}`;

const Carreras = () => {
  const [carreras, setCarreras] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRace, setSelectedRace] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRound, setActiveRound] = useState(null);
  const { selectedYear } = useYear();
  const prefetchedMeetingsRef = useRef(new Set());

  // Refs para animaciones 2026
  const headerRef = useRef(null);
  const timelineRef = useRef(null);

  const raceCardsRef = useRef([]);
  const roundRowsRef = useRef([]);

  const openRaceModal = (carrera) => {
    setSelectedRace(carrera);
    setIsModalOpen(true);
  };

  const closeRaceModal = () => {
    setIsModalOpen(false);
    setSelectedRace(null);
  };

  const meetingsByKey = useMemo(
    () => new Map((meetings || []).map((meeting) => [meeting.meeting_key, meeting])),
    [meetings]
  );

  const timelineItems = useMemo(() => (
    carreras.map((carrera, index) => {
      const meeting = meetingsByKey.get(carrera.meeting_key);
      const roundNumber = getRoundNumber(carrera, index);
      return {
        carrera,
        meeting,
        index,
        roundNumber,
        anchorId: getRoundAnchorId(roundNumber, index),
        isPast: isCarreraCompletada(carrera.date_end),
        isLeft: index % 2 === 0,
      };
    })
  ), [carreras, meetingsByKey]);

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
            getRaces({ signal, year: selectedYear }),
            getMeetings({ signal, year: selectedYear })
          ]),
          timeoutPromise
        ]);

        const carrerasFiltradas = carrerasData.filter(carrera => new Date(carrera.date_start).getFullYear() === selectedYear);
        const meetingsFiltrados = (meetingsData || []).filter(meeting => new Date(meeting.date_start).getFullYear() === selectedYear);

        const carrerasUnicas = dedupeByKey(carrerasFiltradas || [], buildRaceListKey);
        const meetingsUnicos = dedupeByKey(meetingsFiltrados || [], buildMeetingListKey);

        // Sort chronologically
        const sortedRaces = carrerasUnicas.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));

        setCarreras(sortedRaces);
        setMeetings(meetingsUnicos);
      } catch (error) {
        console.error('❌ Error al cargar datos de carreras:', error);
        setError(error.message || 'Error al cargar los datos');
        setCarreras([]);
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
    return () => controller.abort();
  }, [selectedYear]);

  // GSAP 2026 Epic Timeline Animations
  useEffect(() => {
    if (loading || timelineItems.length === 0) return;

    const ctx = gsap.context(() => {
      // Header Enters
      gsap.fromTo(headerRef.current,
        { opacity: 0, y: 100 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power4.out' }
      );



      // Race Cards Stagger
      raceCardsRef.current.forEach((card, index) => {
        if (!card) return;

        const isLeft = index % 2 === 0;

        // Appear from left/right
        gsap.fromTo(card,
          { opacity: 0, x: isLeft ? -100 : 100, rotateY: isLeft ? -15 : 15 },
          {
            opacity: 1, x: 0, rotateY: 0,
            duration: 1,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none reverse'
            }
          }
        );

        // Parallax image inside card slightly
        const bgImg = card.querySelector('.bg-circuit');
        if (bgImg) {
          gsap.fromTo(bgImg,
            { yPercent: -20 },
            { yPercent: 20, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } }
          );
        }
      });
    });

    return () => ctx.revert();
  }, [loading, timelineItems.length]);

  const handleCardHover = (e, index) => {
    const card = raceCardsRef.current[index];
    if (!card) return;
    const isLeft = index % 2 === 0;

    gsap.to(card, {
      scale: 1.03,
      rotateY: isLeft ? 5 : -5,
      rotateX: 2,
      boxShadow: '0 20px 40px rgba(225,6,0,0.15)',
      duration: 0.4,
      ease: 'power2.out',
      transformPerspective: 1000
    });
  };

  const handleCardLeave = (index) => {
    const card = raceCardsRef.current[index];
    if (!card) return;
    gsap.to(card, {
      scale: 1,
      rotateY: 0,
      rotateX: 0,
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      duration: 0.6,
      ease: 'elastic.out(1, 0.5)'
    });
  };

  useEffect(() => {
    if (loading || timelineItems.length === 0) {
      setActiveRound(null);
      return;
    }

    let rafId = null;

    const updateActiveRound = () => {
      const visibleRows = timelineItems
        .map((item, index) => ({ item, el: roundRowsRef.current[index] }))
        .filter(({ el }) => Boolean(el));

      if (visibleRows.length === 0) return;

      const targetY = Math.max(140, window.innerHeight * 0.28);
      let bestMatch = visibleRows[0].item;
      let bestDistance = Number.POSITIVE_INFINITY;

      visibleRows.forEach(({ item, el }) => {
        const rect = el.getBoundingClientRect();
        const distance = Math.abs(rect.top - targetY);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = item;
        }
      });

      setActiveRound((prev) => (prev === bestMatch.roundNumber ? prev : bestMatch.roundNumber));
    };

    const onScrollOrResize = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateActiveRound();
      });
    };

    updateActiveRound();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [loading, timelineItems]);

  if (loading) return <div className="container mx-auto px-4 py-8"><Loader mensaje="Cargando carreras…" /></div>;
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-red-300 font-semibold mb-2">No se pudieron cargar las carreras</p>
          <p className="text-white/70 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const carrerasCompletadas = carreras.filter(c => isCarreraCompletada(c.date_end));
  const totalRaces = getTotalRacesForYear(selectedYear) || carreras.length || 0;
  const progressPercent = totalRaces > 0
    ? Math.round((carrerasCompletadas.length / totalRaces) * 100)
    : 0;

  const scrollToAnchor = (anchorId) => {
    const el = document.getElementById(anchorId);
    if (el) {
      const headerOffset = 112;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      const lenisInstance = window?.__lenis || window?.lenis;
      if (lenisInstance?.scrollTo) {
        lenisInstance.scrollTo(offsetPosition, { duration: 1 });
        return;
      }

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const scrollToRound = (item) => {
    if (!item?.anchorId) return;
    scrollToAnchor(item.anchorId);
  };

  return (
    <div className="min-h-screen bg-f1-dark overflow-x-hidden relative pb-32">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMwYTBhMGEiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMmEyYTJhIi8+PC9zdmc+')] mix-blend-screen" />
      <div className="absolute top-0 left-0 right-0 h-screen bg-gradient-to-b from-f1-red/5 to-transparent pointer-events-none" />

      {/* Hero Header */}
      <div ref={headerRef} className="pt-24 pb-32 max-w-[1400px] mx-auto px-4 sm:px-8 text-center relative z-10 flex flex-col items-center">
        <Flag className="w-16 h-16 sm:w-24 sm:h-24 text-f1-red mb-6 drop-shadow-[0_0_20px_rgba(225,6,0,0.5)]" />
        <h1 className="w-full max-w-[min(94vw,1200px)] px-3 sm:px-6 font-racing text-white uppercase mb-6 filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
          <span className="block whitespace-nowrap text-[clamp(2.4rem,10.2vw,5.8rem)] sm:text-[clamp(3.6rem,9.5vw,7rem)] md:text-[clamp(4.8rem,8.4vw,8.2rem)] tracking-tight sm:tracking-tighter leading-[0.95]">
            EL CALENDARIO
          </span>
          <span className="block mt-1 sm:mt-2 whitespace-nowrap text-[clamp(2.8rem,11.8vw,6rem)] sm:text-[clamp(3.9rem,10.4vw,7.4rem)] md:text-[clamp(5rem,8.8vw,8.5rem)] leading-[1.02] text-transparent bg-clip-text bg-gradient-to-b from-f1-red via-red-600 to-f1-dark text-glow">
            {selectedYear}
          </span>
        </h1>
        <p className="text-xl sm:text-2xl font-sans text-gray-400 font-light max-w-2xl">
          Sigue cada momento de la temporada. Desde semáforo en verde hasta la bandera a cuadros.
        </p>

        <div className="mt-12 flex items-center gap-6 glass rounded-full px-8 py-4 border border-f1-red/20 shadow-[0_0_30px_rgba(225,6,0,0.15)]">
          <div className="flex flex-col items-center">
            <span className="text-4xl font-racing text-white">{carrerasCompletadas.length}</span>
            <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Completadas</span>
          </div>
          <div className="w-px h-12 bg-white/20" />
          <div className="flex flex-col items-center">
            <span className="text-4xl font-racing text-f1-red">{carreras.length - carrerasCompletadas.length}</span>
            <span className="text-xs uppercase tracking-widest text-f1-red/60 font-bold">Restantes</span>
          </div>
          <div className="w-px h-12 bg-white/20" />
          <div className="flex flex-col items-center">
            <span className="text-4xl font-racing text-white">{progressPercent}%</span>
            <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Progreso</span>
          </div>
        </div>

        <div className="mt-20 motion-safe:animate-[subtle-drop_1.8s_cubic-bezier(0.16,1,0.3,1)_infinite] opacity-50">
          <ChevronDown className="w-10 h-10 text-white" />
        </div>
      </div>

      {/* Curved Road Timeline */}
      <div ref={timelineRef} className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 mt-10">
        <div className="relative lg:mr-[20rem]">
          {/* Curving SVG Road (desktop only) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block"
            viewBox={`0 0 1000 ${Math.max(760, carreras.length * 120 + 420)}`}
            preserveAspectRatio="none"
            style={{ zIndex: 0 }}
            aria-hidden="true"
          >
            {(() => {
              const n = carreras.length;
              if (n === 0) return null;
              const segH = 120;
              const lx = 200, rx = 800, cx = 500;
              const startY = 20;
              let d = `M ${cx} ${startY}`;
              let px = cx;
              for (let i = 0; i < n; i++) {
                const tx = i % 2 === 0 ? lx : rx;
                const y = startY + (i + 0.5) * segH;
                const py = i === 0 ? startY : startY + ((i - 1) + 0.5) * segH;
                const midY = (py + y) / 2;
                d += ` C ${px} ${midY}, ${tx} ${midY}, ${tx} ${y}`;
                px = tx;
              }
              const lastNodeY = startY + (n - 0.5) * segH;
              const finishY = startY + n * segH + 260;
              const holdCurveY = lastNodeY + segH * 1.1;
              const lateBendY = finishY - 60;
              d += ` C ${px} ${holdCurveY}, ${px} ${lateBendY}, ${cx} ${finishY}`;

              return (
                <>
                  {/* Road edge glow */}
                  <path d={d} stroke="rgba(225,6,0,0.12)" strokeWidth={62} fill="none"
                    vectorEffect="non-scaling-stroke" strokeLinecap="butt" strokeLinejoin="round" />
                  {/* Road edges */}
                  <path d={d} stroke="#3a3a3a" strokeWidth={56} fill="none"
                    vectorEffect="non-scaling-stroke" strokeLinecap="butt" strokeLinejoin="round" />
                  {/* Asphalt surface */}
                  <path d={d} stroke="#1e1e1e" strokeWidth={48} fill="none"
                    vectorEffect="non-scaling-stroke" strokeLinecap="butt" strokeLinejoin="round" />
                  {/* Asphalt texture stripe */}
                  <path d={d} stroke="#222" strokeWidth={44} fill="none"
                    vectorEffect="non-scaling-stroke" strokeLinecap="butt" strokeLinejoin="round" />
                  {/* Center dashed line */}
                  <path d={d} stroke="rgba(255,255,255,0.5)" strokeWidth={3} fill="none"
                    strokeDasharray="18 14" vectorEffect="non-scaling-stroke" strokeLinecap="butt" />
                </>
              );
            })()}
          </svg>

          {/* Mobile: simple straight road on left */}
          <div className="md:hidden road-track left-[8px]">
            <div className="road-dashed-line" />
          </div>

          <div className="relative py-10">
          {timelineItems.map((item, index) => {
            const { carrera, meeting, isPast, isLeft, roundNumber, anchorId } = item;

            return (
              <div
                id={anchorId}
                key={anchorId}
                ref={(el) => { roundRowsRef.current[index] = el; }}
                data-round-number={roundNumber}
                className="relative flex items-center w-full mb-24 md:mb-32 scroll-mt-32 md:grid md:grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] md:items-center"
              >

                {/* Road Marker */}
                <div
                  className={`absolute top-1/2 left-[28px] md:left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2] rounded-full border-2 border-[#1a1a1a] ${
                    isPast
                      ? 'w-4 h-4 bg-f1-red shadow-[0_0_0_3px_rgba(225,6,0,0.28),0_0_16px_rgba(225,6,0,0.22)]'
                      : 'w-3.5 h-3.5 bg-gray-500 shadow-[0_0_0_2px_rgba(107,114,128,0.25)]'
                  }`}
                  aria-hidden="true"
                >
                  {isPast && <div className="absolute inset-0 bg-f1-red animate-ping rounded-full opacity-35" />}
                </div>

                {/* Card Container */}
                <div
                  className={`w-full pl-24 md:pl-0 md:w-full md:max-w-[34rem] relative z-10 ${
                    isLeft
                      ? 'md:col-start-1 md:justify-self-end md:pr-4'
                      : 'md:col-start-3 md:justify-self-start md:pl-4'
                  }`}
                >
                  <div
                    ref={el => raceCardsRef.current[index] = el}
                    onMouseEnter={(e) => { handleCardHover(e, index); prefetchMeeting(meeting?.meeting_key || carrera.meeting_key); }}
                    onMouseLeave={() => handleCardLeave(index)}
                    onClick={() => openRaceModal(carrera)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openRaceModal(carrera);
                      }
                    }}
                    className="glass rounded-[2rem] overflow-hidden group cursor-pointer border border-white/5 relative"
                    style={{ opacity: 0 }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Abrir detalle de carrera ${meeting?.meeting_name || carrera.session_name || ''}`}
                  >
                    {/* Subtle Background gradient */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${isPast ? 'from-f1-red to-red-500' : 'from-blue-500 to-indigo-500'}`} />

                    {/* Round Number (Huge background text) */}
                    <div className="absolute -right-6 top-0 text-[10rem] font-racing text-white/5 leading-none pointer-events-none select-none -z-10 group-hover:text-white/10 transition-colors">
                      {roundNumber}
                    </div>

                    <div className="p-6 md:p-8">
                      {/* Top Info */}
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h2 className="text-3xl font-racing text-white leading-tight uppercase line-clamp-2 pr-4">
                            {meeting?.meeting_name || carrera.session_name || 'Carrera'}
                          </h2>
                          <p className="text-f1-red font-sans font-bold uppercase tracking-widest text-sm mt-1">ROUND {roundNumber}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full glass shrink-0 flex items-center justify-center shadow-lg border border-white/10">
                          {isPast ? <CheckCircle2 className="w-6 h-6 text-f1-red" /> : <Clock className="w-6 h-6 text-gray-500" />}
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="glass-dark rounded-xl p-3 flex flex-col gap-1">
                          <span className="text-white/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3" /> Ubicación</span>
                          <span className="text-white font-semibold text-sm line-clamp-1">{meeting?.location || meeting?.country_name || 'Ubicación'}</span>
                        </div>
                        <div className="glass-dark rounded-xl p-3 flex flex-col gap-1">
                          <span className="text-white/40 text-xs font-bold uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha</span>
                          <span className="text-white font-semibold text-sm">{formatearFecha(carrera.date_start)}</span>
                        </div>
                        <div className="glass-dark rounded-xl p-3 flex flex-col gap-1 col-span-2">
                          <span className="text-white/40 text-xs font-bold uppercase tracking-wider">Circuito</span>
                          <span className="text-white font-bold text-lg">{meeting?.circuit_short_name || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Hover Action */}
                      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest opacity-0 group-hover:translate-x-2 group-hover:opacity-100 transition-all duration-300" style={{ color: isPast ? '#ef4444' : '#60a5fa' }}>
                        {isPast ? 'Ver Resultados' : 'Ver Horarios'} &rarr;
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Finish Line Checkered Flag */}
          {carreras.length > 0 && (
            <div id="season-finish-line" className="relative mt-10 lg:mt-20 mb-8 scroll-mt-32">
              <div className="md:hidden h-12 w-px border-l-2 border-dashed border-white/30 absolute -top-10 left-[28px]" />

              <div className="relative z-20 mx-auto max-w-3xl">
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(10,10,10,0.92),rgba(22,22,28,0.94))] shadow-[0_20px_60px_rgba(0,0,0,0.45)] px-4 py-5 md:px-8 md:py-8">
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_80%_120%,rgba(225,6,0,0.18),transparent_50%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.06),transparent_45%)]" />

                  <div className="relative flex flex-col items-center gap-5">
                    <div className="hidden md:block absolute -top-16 left-1/2 -translate-x-1/2 h-16 w-[3px] bg-gradient-to-b from-white/0 via-white/20 to-white/35" />

                    <div className="flex items-end justify-center gap-4 md:gap-6">
                      <div className="h-12 md:h-16 w-[3px] rounded-full bg-white/35 shadow-[0_0_12px_rgba(255,255,255,0.12)]" />
                      <div className="relative">
                        <div className="h-7 md:h-9 w-44 sm:w-52 md:w-72 rounded-sm border border-white/25 shadow-[0_10px_24px_rgba(0,0,0,0.35)] bg-[length:24px_24px] bg-[image:linear-gradient(45deg,rgba(255,255,255,0.95)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.95)_75%,rgba(255,255,255,0.95)),linear-gradient(45deg,rgba(255,255,255,0.95)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.95)_75%,rgba(255,255,255,0.95))] bg-[position:0_0,12px_12px] bg-zinc-950" />
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-f1-red/10" />
                      </div>
                      <div className="h-12 md:h-16 w-[3px] rounded-full bg-white/35 shadow-[0_0_12px_rgba(255,255,255,0.12)]" />
                    </div>

                    <div className="flex items-center justify-center gap-3 md:gap-4">
                      <Flag className="w-5 h-5 md:w-7 md:h-7 text-white" />
                      <span className="font-racing text-xl sm:text-2xl md:text-3xl tracking-[0.14em] text-white text-center">
                        BANDERA A CUADROS
                      </span>
                      <Flag className="w-5 h-5 md:w-7 md:h-7 text-white" />
                    </div>

                    <p className="text-[11px] sm:text-xs md:text-sm uppercase tracking-[0.2em] text-white/60 text-center">
                      Fin del calendario {selectedYear}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Quick Round Navigator (Desktop/Tablet) */}
      {timelineItems.length > 0 && !isModalOpen && (
        <aside className="hidden md:block fixed right-3 lg:right-6 top-28 bottom-6 z-[45] w-[220px] lg:w-[280px]" data-lenis-prevent>
          <div className="h-full rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(9,11,18,0.96),rgba(12,16,24,0.94))] shadow-[0_24px_60px_rgba(0,0,0,0.42)] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/55 font-semibold">Navegación</p>
                  <p className="text-sm font-semibold text-white">
                    Rondas
                    {activeRound ? <span className="text-white/60 font-normal"> · {activeRound}</span> : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToAnchor('season-finish-line')}
                  className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-white/5 text-white/75 hover:text-white hover:border-f1-red/40 hover:bg-f1-red/10 transition-colors"
                  title="Ir a la meta"
                  aria-label="Ir a la meta de la temporada"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto no-scrollbar overscroll-contain p-2"
              data-lenis-prevent
              data-lenis-prevent-wheel
              data-lenis-prevent-touch
            >
              <div className="space-y-1.5">
                {timelineItems.map((item) => {
                  const { carrera, meeting, roundNumber, isPast, anchorId } = item;
                  const isActive = activeRound === roundNumber;

                  return (
                    <button
                      key={`quick-nav-${anchorId}`}
                      type="button"
                      onClick={() => scrollToRound(item)}
                      className={`w-full text-left rounded-2xl border px-2.5 py-2.5 transition-all duration-200 ${
                        isActive
                          ? 'border-f1-red/45 bg-f1-red/10 shadow-[0_8px_22px_rgba(225,6,0,0.12)]'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15'
                      }`}
                      title={`Ir a la ronda ${roundNumber}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black border ${
                          isActive
                            ? 'bg-f1-red/15 text-f1-red border-f1-red/35'
                            : isPast
                              ? 'bg-f1-red/8 text-f1-red/90 border-f1-red/20'
                              : 'bg-white/5 text-white/70 border-white/10'
                        }`}>
                          {roundNumber}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`text-xs uppercase tracking-wider truncate ${isActive ? 'text-white' : 'text-white/85'}`}>
                            {meeting?.circuit_short_name || meeting?.meeting_name || carrera.session_name || `Ronda ${roundNumber}`}
                          </p>
                          <p className="text-[11px] text-white/50 truncate">
                            {(meeting?.location || meeting?.country_name || 'Circuito')} · {formatearFecha(carrera.date_start)}
                          </p>
                        </div>

                        <div className="shrink-0">
                          {isPast ? (
                            <CheckCircle2 className={`w-4 h-4 ${isActive ? 'text-f1-red' : 'text-f1-red/80'}`} />
                          ) : (
                            <Clock className={`w-4 h-4 ${isActive ? 'text-white/80' : 'text-white/45'}`} />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => scrollToAnchor('season-finish-line')}
                  className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 px-2.5 py-2.5 transition-colors"
                  title="Ir a la meta"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="shrink-0 w-9 h-9 rounded-xl border border-white/15 bg-white/5 text-white/80 flex items-center justify-center">
                      <Flag className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wider text-white">Meta</p>
                      <p className="text-[11px] text-white/50">Bandera a cuadros</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

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
