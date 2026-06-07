import { useState, useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { getRaces, getMeetings } from '../services/openf1Service';
import Loader from '../components/ui/Loader';
import RaceModal from '../components/ui/RaceModal';
import { formatearFecha, isCarreraCompletada } from '../utils/dateUtils';
import { Flag, CheckCircle2, Clock } from 'lucide-react';
import { useYear } from '../contexts/YearContext';
import { getTotalRacesForYear } from '../services/config/apiConfig';

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

const getRaceTitle = (carrera, meeting, roundNumber) => (
  meeting?.meeting_name ||
  meeting?.meeting_official_name ||
  carrera?.race_name ||
  carrera?.meeting_name ||
  (carrera?.session_name && carrera.session_name.toLowerCase() !== 'race' ? carrera.session_name : null) ||
  `Ronda ${roundNumber}`
);

const getCircuitLabel = (carrera, meeting) => (
  meeting?.circuit_short_name ||
  carrera?.circuit_short_name ||
  meeting?.location ||
  carrera?.location ||
  meeting?.country_name ||
  carrera?.country_name ||
  'Circuito por confirmar'
);

const Carreras = () => {
  const [carreras, setCarreras] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRace, setSelectedRace] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRound, setActiveRound] = useState(null);
  const { selectedYear } = useYear();
  // Refs para animaciones 2026
  const headerRef = useRef(null);
  const timelineRef = useRef(null);
  const calendarScrollRef = useRef(null);

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

  const meetingsByDay = useMemo(
    () => new Map((meetings || []).map((meeting) => [getDayKey(meeting.date_end || meeting.date_start), meeting]).filter(([key]) => key)),
    [meetings]
  );

  const meetingsByRound = useMemo(
    () => new Map((meetings || [])
      .map((meeting) => [Number.parseInt(meeting.round, 10), meeting])
      .filter(([round]) => Number.isFinite(round) && round > 0)),
    [meetings]
  );

  const timelineItems = useMemo(() => (
    carreras.map((carrera, index) => {
      const roundNumber = getRoundNumber(carrera, index);
      const dayKey = getDayKey(carrera.date_end || carrera.date_start);
      const meeting = meetingsByKey.get(carrera.meeting_key) ||
        meetingsByDay.get(dayKey) ||
        meetingsByRound.get(roundNumber);

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
  ), [carreras, meetingsByKey, meetingsByDay, meetingsByRound]);

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

  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, { y: 18, duration: 0.45, ease: 'power2.out' });
    });

    return () => ctx.revert();
  }, [loading]);

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
    const scrollElement = calendarScrollRef.current;
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);
    scrollElement?.addEventListener('scroll', onScrollOrResize, { passive: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      scrollElement?.removeEventListener('scroll', onScrollOrResize);
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
      el.scrollIntoView({
        block: 'start',
        behavior: 'smooth'
      });
    }
  };

  const scrollToRound = (item) => {
    if (!item?.anchorId) return;
    scrollToAnchor(item.anchorId);
  };

  return (
    <div className="control-page">
      <div className="race-shell control-shell">
        <aside className="race-rail flex min-h-0 flex-col" data-lenis-prevent>
          <div className="hud-kicker mb-5">
            <Flag className="h-3.5 w-3.5" />
            Calendario
          </div>
          <h1 className="font-racing text-[2rem] italic leading-none text-white">Carreras</h1>
          <p className="mt-3 text-sm text-white/58">
            Calendario como panel de control: rondas accesibles, estado inmediato y modal de detalle al seleccionar.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="border border-white/10 bg-black/20 p-2">
              <p className="data-value text-xl">{carrerasCompletadas.length}</p>
              <p className="data-label">Hechas</p>
            </div>
            <div className="border border-white/10 bg-black/20 p-2">
              <p className="data-value text-xl text-f1-copper">{carreras.length - carrerasCompletadas.length}</p>
              <p className="data-label">Quedan</p>
            </div>
            <div className="border border-white/10 bg-black/20 p-2">
              <p className="data-value text-xl">{progressPercent}%</p>
              <p className="data-label">Curso</p>
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden border border-white/10 bg-black/30">
            <div className="h-full bg-gradient-to-r from-f1-red to-f1-copper" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto no-scrollbar pr-1" data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch>
            {timelineItems.map((item) => {
              const { carrera, meeting, roundNumber, isPast, anchorId } = item;
              const isActive = activeRound === roundNumber;

              return (
                <button
                  key={`rail-${anchorId}`}
                  type="button"
                  onClick={() => scrollToRound(item)}
                  className={`timing-row w-full grid-cols-[2.5rem_1fr_auto] text-left ${isActive ? 'border-f1-red/45 bg-f1-red/10' : ''}`}
                >
                  <span className="data-value text-f1-copper">{roundNumber}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold uppercase tracking-wide text-white/80">
                      {getCircuitLabel(carrera, meeting)}
                    </span>
                    <span className="block truncate text-[11px] text-white/45">{formatearFecha(carrera.date_start)}</span>
                  </span>
                  {isPast ? <CheckCircle2 className="h-4 w-4 text-f1-red" /> : <Clock className="h-4 w-4 text-white/45" />}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="control-main">
          <header ref={headerRef} className="race-module shrink-0">
            <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="hud-kicker mb-4">Temporada {selectedYear}</div>
                <h2 className="font-racing text-4xl italic leading-none text-white sm:text-6xl">Calendario</h2>
                <p className="mt-3 max-w-3xl text-sm text-white/60">
                  Fechas, circuito, estado y acceso directo al detalle de cada Gran Premio de la temporada.
                </p>
              </div>
              <button
                type="button"
                onClick={() => scrollToAnchor('season-finish-line')}
                className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-white/70 hover:border-f1-copper/40 hover:text-white"
              >
                <Flag className="h-4 w-4" />
                Meta
              </button>
            </div>
          </header>

          <div ref={timelineRef} className="race-module flex min-h-0 flex-1 flex-col">
            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              <div className="hidden grid-cols-[4rem_1.2fr_1fr_9rem_7rem_auto] gap-3 border-b border-white/10 pb-2 data-label lg:grid">
                <span>Ronda</span>
                <span>Evento</span>
                <span>Circuito</span>
                <span>Fecha</span>
                <span>Estado</span>
                <span>Acción</span>
              </div>

              <div ref={calendarScrollRef} className="control-scroll mt-3 space-y-2" data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch>
                {timelineItems.map((item, index) => {
                  const { carrera, meeting, isPast, roundNumber, anchorId } = item;

                  return (
                    <button
                      id={anchorId}
                      key={anchorId}
                      ref={(el) => {
                        roundRowsRef.current[index] = el;
                        raceCardsRef.current[index] = el;
                      }}
                      data-round-number={roundNumber}
                      type="button"
                      onMouseEnter={(e) => handleCardHover(e, index)}
                      onMouseLeave={() => handleCardLeave(index)}
                      onClick={() => openRaceModal(carrera)}
                      className="timing-row w-full scroll-mt-32 grid-cols-[3.2rem_1fr_auto] text-left lg:grid-cols-[4rem_1.2fr_1fr_9rem_7rem_auto]"
                      style={{ borderLeft: `4px solid ${isPast ? '#ff553d' : '#64748b'}` }}
                    >
                      <span className="data-value text-f1-copper">R{roundNumber}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold uppercase text-white">
                          {getRaceTitle(carrera, meeting, roundNumber)}
                        </span>
                        <span className="block truncate text-xs text-white/45 lg:hidden">
                          {getCircuitLabel(carrera, meeting)} · {formatearFecha(carrera.date_start)}
                        </span>
                      </span>
                      <span className="hidden truncate text-sm text-white/65 lg:block">{getCircuitLabel(carrera, meeting)}</span>
                      <span className="hidden font-mono text-xs text-white/65 lg:block">{formatearFecha(carrera.date_start)}</span>
                      <span className={`hidden font-mono text-xs uppercase tracking-[0.12em] lg:block ${isPast ? 'text-f1-copper' : 'text-white/45'}`}>
                        {isPast ? 'Completada' : 'Pendiente'}
                      </span>
                      <span className="justify-self-end">
                        {isPast ? <CheckCircle2 className="h-5 w-5 text-f1-red" /> : <Clock className="h-5 w-5 text-white/45" />}
                      </span>
                    </button>
                  );
                })}
                {carreras.length > 0 && (
                  <div id="season-finish-line" className="scroll-mt-32 border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="data-label">Fin de calendario</p>
                        <h3 className="section-title">Bandera a cuadros {selectedYear}</h3>
                      </div>
                      <div className="h-8 w-48 border border-white/20 bg-[length:20px_20px] bg-[image:linear-gradient(45deg,rgba(255,255,255,0.95)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.95)_75%,rgba(255,255,255,0.95)),linear-gradient(45deg,rgba(255,255,255,0.95)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.95)_75%,rgba(255,255,255,0.95))] bg-[position:0_0,10px_10px] bg-zinc-950" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

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
