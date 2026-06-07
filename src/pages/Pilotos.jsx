import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { getDrivers, getDriverStandings, getDriverSeasonStatsFromErgast } from '../services/openf1Service';
import Loader from '../components/ui/Loader';
import { X, User, Users, Flag, Hash, Shield, Info, Trophy, Medal, Target, Gauge, Timer, TrendingUp, Search, ListFilter } from 'lucide-react';
import { getDriverNationality } from '../utils/nationalityUtils';
import { getDriverFlag } from '../utils/flagUtils.jsx';
import { getTeamLogo, getTeamColor, getDriverPhoto } from '../utils/formatUtils';
import { useYear } from '../contexts/YearContext';
import { useAsyncDataParallel } from '../hooks/useAsyncData';

const Pilotos = () => {
  const [pilotoSeleccionado, setPilotoSeleccionado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [shouldRenderModal, setShouldRenderModal] = useState(false);
  const [seasonStats, setSeasonStats] = useState(null);
  const [seasonStatsLoading, setSeasonStatsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const { selectedYear } = useYear();

  // Refs para animaciones
  const headerRef = useRef(null);
  const gridRef = useRef(null);
  const cardRefs = useRef([]);
  const modalBackdropRef = useRef(null);
  const modalContentRef = useRef(null);
  const modalImageRef = useRef(null);
  const modalStatsRef = useRef([]);
  const modalTeamRef = useRef(null);
  const modalCloseButtonRef = useRef(null);

  // Usar el hook personalizado para manejar las llamadas con cleanup
  const { data, loading, error } = useAsyncDataParallel([
    (signal) => getDrivers({ signal, year: selectedYear }),
    (signal) => getDriverStandings({ signal, year: selectedYear })
  ], [selectedYear]);

  const [driversData = [], standings = []] = data;
  const standingsFallbackDrivers = Array.isArray(standings)
    ? standings.map((standing, index) => ({
      driver_number: standing.driver?.permanentNumber || `S${index + 1}`,
      full_name: `${standing.driver?.givenName || ''} ${standing.driver?.familyName || ''}`.trim() || standing.driver?.code || 'Piloto',
      name_acronym: standing.driver?.code || `DRV${index + 1}`,
      team_name: standing.constructor?.name || 'Equipo no disponible',
      team_colour: standing.constructor?.name ? getTeamColor(standing.constructor.name) : '',
      country_code: standing.driver?.nationality || 'Unknown',
      nationality: standing.driver?.nationality || 'Unknown',
      headshot_url: null
    }))
    : [];
  const sourceDrivers = Array.isArray(driversData) && driversData.length > 0
    ? driversData
    : standingsFallbackDrivers;

  // Mapear puntos desde standings a los pilotos
  const pilotos = sourceDrivers.map((p) => {
    const dn = (p.driver_number ?? '').toString();
    const code = (p.name_acronym ?? '').toLowerCase();
    const full = (p.full_name ?? '').trim().toLowerCase();

    const sr =
      standings.find((s) => (s.driver?.permanentNumber ?? '').toString() === dn) ||
      standings.find((s) => (s.driver?.code ?? '').toLowerCase() === code) ||
      standings.find(
        (s) => `${(s.driver?.givenName ?? '').trim().toLowerCase()} ${(s.driver?.familyName ?? '').trim().toLowerCase()}` === full
      );

    return {
      ...p,
      points: sr?.points ?? p.points ?? 0,
      position: sr?.position ?? p.position ?? null,
      wins: sr?.wins ?? p.wins ?? 0,
      driver_id: sr?.driver?.driverId || p.driver_id || p.driverId || null,
      team_name: p.team_name || sr?.constructor?.name || 'Equipo no disponible',
      team_colour: p.team_colour || (sr?.constructor?.name ? getTeamColor(sr.constructor.name) : p.team_colour)
    };
  });

  // Ordenar por equipo y número
  const sortedPilotos = [...pilotos].sort((a, b) => {
    const ta = (a.team_name || '').toLowerCase();
    const tb = (b.team_name || '').toLowerCase();
    const cmp = ta.localeCompare(tb, 'es', { sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    const na = Number(a.driver_number) || 0;
    const nb = Number(b.driver_number) || 0;
    return na - nb;
  });

  const championshipSortedPilotos = [...pilotos].sort((a, b) => {
    const posA = Number(a.position || 999);
    const posB = Number(b.position || 999);
    if (posA !== posB) return posA - posB;
    return Number(b.points || 0) - Number(a.points || 0);
  });

  const teamOptions = Array.from(new Set(sortedPilotos.map((piloto) => piloto.team_name).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  const visiblePilotos = championshipSortedPilotos.filter((piloto) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery ||
      String(piloto.full_name || '').toLowerCase().includes(normalizedQuery) ||
      String(piloto.name_acronym || '').toLowerCase().includes(normalizedQuery) ||
      String(piloto.driver_number || '').toLowerCase().includes(normalizedQuery) ||
      String(piloto.team_name || '').toLowerCase().includes(normalizedQuery);
    const matchesTeam = selectedTeamFilter === 'all' || piloto.team_name === selectedTeamFilter;
    return matchesQuery && matchesTeam;
  });

  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.from(headerRef.current, { y: -16, duration: 0.45, ease: 'power2.out' });
      }

      if (gridRef.current) {
        gsap.from(gridRef.current, { y: 16, duration: 0.45, ease: 'power2.out' });
      }
    });

    return () => ctx.revert();
  }, [loading, sortedPilotos.length]);

  // Manejar apertura del modal
  useEffect(() => {
    if (modalAbierto && !shouldRenderModal) {
      setShouldRenderModal(true);
    }
  }, [modalAbierto, shouldRenderModal]);

  // Animación de entrada del modal
  useEffect(() => {
    if (!modalAbierto || !shouldRenderModal || !modalBackdropRef.current || !modalContentRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Backdrop
      tl.fromTo(
        modalBackdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );

      // Modal content
      tl.fromTo(
        modalContentRef.current,
        { opacity: 0, scale: 0.7, y: 100, rotateX: -15 },
        { opacity: 1, scale: 1, y: 0, rotateX: 0, duration: 0.6, ease: 'back.out(1.5)' },
        '-=0.2'
      );

      // Image
      if (modalImageRef.current) {
        tl.fromTo(
          modalImageRef.current,
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.5)' },
          '-=0.3'
        );
      }

      // Stats
      const validStats = modalStatsRef.current.filter(Boolean);
      if (validStats.length > 0) {
        tl.fromTo(
          validStats,
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out' },
          '-=0.2'
        );
      }

      // Team info
      if (modalTeamRef.current) {
        tl.fromTo(
          modalTeamRef.current,
          { opacity: 0, y: 40, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' },
          '-=0.2'
        );
      }
    });

    return () => ctx.revert();
  }, [modalAbierto, shouldRenderModal, pilotoSeleccionado]);

  const handleClickPiloto = (piloto) => {
    setPilotoSeleccionado(piloto);
    setModalAbierto(true);
  };

  const handleCerrarModal = useCallback(() => {
    if (!modalBackdropRef.current || !modalContentRef.current) {
      setModalAbierto(false);
      setShouldRenderModal(false);
      setPilotoSeleccionado(null);
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        setModalAbierto(false);
        setShouldRenderModal(false);
        setPilotoSeleccionado(null);
      }
    });

    tl.to(modalContentRef.current, {
      opacity: 0,
      scale: 0.7,
      y: 100,
      rotateX: 15,
      duration: 0.4,
      ease: 'power2.in'
    });

    tl.to(modalBackdropRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in'
    }, '-=0.1');
  }, []);

  useEffect(() => {
    if (!shouldRenderModal || !modalAbierto) return undefined;

    const previousActiveElement = document.activeElement;
    const focusTimer = window.setTimeout(() => {
      modalCloseButtonRef.current?.focus();
    }, 0);

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        handleCerrarModal();
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
  }, [handleCerrarModal, modalAbierto, shouldRenderModal]);

  // Hover handlers for modal elements
  const handleStatHover = useCallback((e, isHovering, teamColor) => {
    const rgb = teamColor ? hexToRgb(teamColor) : { r: 239, g: 68, b: 68 };
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.05 : 1,
      y: isHovering ? -5 : 0,
      boxShadow: isHovering
        ? `0 10px 25px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`
        : 'none',
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

  const handleCloseHover = useCallback((e, isHovering) => {
    gsap.to(e.currentTarget, {
      scale: isHovering ? 1.1 : 1,
      rotation: isHovering ? 90 : 0,
      duration: 0.3,
      ease: 'power2.out'
    });
  }, []);

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

  const normalizeTeamHex = (value) => {
    if (!value) return '';
    const clean = String(value).trim();
    return clean.startsWith('#') ? clean : `#${clean}`;
  };

  const selectedDriverPhotoCandidate = pilotoSeleccionado ? getDriverPhoto(pilotoSeleccionado) : null;
  const selectedDriverPhoto =
    selectedDriverPhotoCandidate && selectedDriverPhotoCandidate.startsWith('/drivers/')
      ? selectedDriverPhotoCandidate
      : null;

  useEffect(() => {
    if (!pilotoSeleccionado || !modalAbierto) {
      setSeasonStats(null);
      setSeasonStatsLoading(false);
      return;
    }

    const controller = new AbortController();
    const driverId = pilotoSeleccionado.driver_id;

    const fetchSeasonStats = async () => {
      if (!driverId) {
        setSeasonStats(null);
        setSeasonStatsLoading(false);
        return;
      }

      try {
        setSeasonStatsLoading(true);
        const stats = await getDriverSeasonStatsFromErgast({
          signal: controller.signal,
          year: selectedYear,
          driverId,
          nameAcronym: pilotoSeleccionado.name_acronym,
          fullName: pilotoSeleccionado.full_name,
          givenName: pilotoSeleccionado.first_name || pilotoSeleccionado.givenName,
          familyName: pilotoSeleccionado.last_name || pilotoSeleccionado.familyName,
          driverNumber: pilotoSeleccionado.driver_number
        });
        if (!controller.signal.aborted) {
          setSeasonStats(stats);
        }
      } catch (seasonError) {
        if (!controller.signal.aborted) {
          setSeasonStats(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSeasonStatsLoading(false);
        }
      }
    };

    fetchSeasonStats();
    return () => controller.abort();
  }, [pilotoSeleccionado, modalAbierto, selectedYear]);

  const formatMetricValue = (value, suffix = '') => {
    if (value === null || value === undefined || value === '') return 'N/A';
    return `${value}${suffix}`;
  };

  const basicStats = pilotoSeleccionado
    ? [
      { icon: User, label: 'Acrónimo', value: pilotoSeleccionado.name_acronym || 'N/A' },
      { icon: Flag, label: 'Nacionalidad', value: getDriverNationality(pilotoSeleccionado), flag: getDriverFlag(pilotoSeleccionado) },
      { icon: Hash, label: 'Número', value: pilotoSeleccionado.driver_number || 'N/A' }
    ]
    : [];

  const loadingSeasonValue = seasonStatsLoading && !seasonStats ? '…' : null;

  const performanceStats = pilotoSeleccionado
    ? [
      {
        icon: TrendingUp,
        label: 'Posición',
        value: formatMetricValue(pilotoSeleccionado.position),
        tone: 'text-cyan-300'
      },
      {
        icon: Gauge,
        label: 'Puntos',
        value: `${Number(pilotoSeleccionado.points || 0).toLocaleString('es-ES')} pts`,
        tone: 'text-emerald-300'
      },
      {
        icon: Trophy,
        label: 'Victorias',
        value: loadingSeasonValue || formatMetricValue(seasonStats?.wins ?? pilotoSeleccionado.wins ?? 0),
        tone: 'text-yellow-300'
      },
      {
        icon: Target,
        label: 'Poles',
        value: loadingSeasonValue || formatMetricValue(seasonStats?.poles),
        tone: 'text-fuchsia-300'
      },
      {
        icon: Medal,
        label: 'Podios',
        value: loadingSeasonValue || formatMetricValue(seasonStats?.podiums),
        tone: 'text-amber-300'
      },
      {
        icon: Timer,
        label: 'Carreras',
        value: loadingSeasonValue || formatMetricValue(seasonStats?.races),
        tone: 'text-sky-300'
      },
      {
        icon: Gauge,
        label: 'Top 10',
        value: loadingSeasonValue || formatMetricValue(seasonStats?.top10),
        tone: 'text-lime-300'
      },
      {
        icon: Timer,
        label: 'Vueltas rápidas',
        value: loadingSeasonValue || formatMetricValue(seasonStats?.fastestLaps),
        tone: 'text-rose-300'
      },
      {
        icon: Medal,
        label: 'Mejor resultado',
        value: loadingSeasonValue || formatMetricValue(seasonStats?.bestFinish),
        tone: 'text-orange-300'
      },
      {
        icon: Target,
        label: 'Mejor parrilla',
        value: loadingSeasonValue || formatMetricValue(seasonStats?.bestGrid),
        tone: 'text-indigo-300'
      }
    ]
    : [];

  if (loading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-x-hidden">
        <Loader mensaje="Cargando pilotos…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-x-hidden">
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-white/70">Error al cargar pilotos: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="control-page">
      <div className="race-shell control-shell">
        <aside className="race-rail flex min-h-0 flex-col overflow-y-auto" data-lenis-prevent>
          <div className="hud-kicker mb-5">
            <Users className="h-3.5 w-3.5" />
            Parrilla
          </div>
          <h1 className="font-racing text-[2rem] italic leading-none text-white">Pilotos</h1>
          <p className="mt-3 text-sm text-white/58">
            La parrilla se lee como una torre de tiempos: posición, piloto, equipo y puntos visibles de un vistazo.
          </p>

          <div className="mt-6 space-y-3">
            <label className="block">
              <span className="data-label mb-2 block">Buscar</span>
              <div className="flex items-center gap-2 border border-white/10 bg-black/25 px-3 py-2">
                <Search className="h-4 w-4 text-white/45" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                  placeholder="Nombre, dorsal, equipo"
                />
              </div>
            </label>

            <label className="block">
              <span className="data-label mb-2 block">Equipo</span>
              <div className="flex items-center gap-2 border border-white/10 bg-black/25 px-3 py-2">
                <ListFilter className="h-4 w-4 text-white/45" />
                <select
                  value={selectedTeamFilter}
                  onChange={(event) => setSelectedTeamFilter(event.target.value)}
                  className="w-full bg-transparent text-sm text-white outline-none"
                >
                  <option className="bg-f1-dark" value="all">Todos los equipos</option>
                  {teamOptions.map((team) => (
                    <option className="bg-f1-dark" key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="border border-white/10 bg-black/20 p-3">
              <p className="data-label">Pilotos</p>
              <p className="data-value mt-1 text-2xl">{visiblePilotos.length}</p>
            </div>
            <div className="border border-white/10 bg-black/20 p-3">
              <p className="data-label">Equipos</p>
              <p className="data-value mt-1 text-2xl">{teamOptions.length}</p>
            </div>
          </div>
        </aside>

        <main className="control-main">
          <header ref={headerRef} className="race-module shrink-0">
            <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="hud-kicker mb-4">Temporada {selectedYear}</div>
                <h2 className="font-racing text-4xl italic leading-none text-white sm:text-6xl">Pilotos</h2>
                <p className="mt-3 max-w-3xl text-sm text-white/60">
                  Posición, dorsal, equipo y rendimiento de temporada en una lectura compacta de parrilla.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
                <div className="border border-white/10 bg-black/25 px-3 py-2">
                  <p className="data-label">P1</p>
                  <p className="data-value mt-1 truncate">{championshipSortedPilotos[0]?.name_acronym || '-'}</p>
                </div>
                <div className="border border-white/10 bg-black/25 px-3 py-2">
                  <p className="data-label">Máx. pts</p>
                  <p className="data-value mt-1">{championshipSortedPilotos[0]?.points || 0}</p>
                </div>
                <div className="border border-white/10 bg-black/25 px-3 py-2">
                  <p className="data-label">Mostrados</p>
                  <p className="data-value mt-1">{visiblePilotos.length}</p>
                </div>
              </div>
            </div>
          </header>

          {sortedPilotos.length === 0 ? (
            <div className="race-module text-center">
              <p className="text-white/85 font-semibold mb-2">No hay pilotos disponibles todavía</p>
              <p className="text-white/60 text-sm">
                Estamos esperando la publicación oficial de la parrilla para la temporada {selectedYear}.
              </p>
            </div>
          ) : (
            <div ref={gridRef} className="race-module flex min-h-0 flex-1 flex-col">
              <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                <div className="hidden grid-cols-[4rem_4.5rem_1fr_1fr_5rem_5rem] gap-3 border-b border-white/10 pb-2 data-label md:grid">
                  <span>Pos</span>
                  <span>Dorsal</span>
                  <span>Piloto</span>
                  <span>Equipo</span>
                  <span>Pts</span>
                  <span>Wins</span>
                </div>
                <div className="control-scroll mt-3 space-y-2" data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch>
                  {visiblePilotos.map((piloto, index) => {
                    const teamColor = piloto.team_colour ? `#${piloto.team_colour.replace('#', '')}` : getTeamColor(piloto.team_name);
                    const photo = getDriverPhoto(piloto);
                    const flag = getDriverFlag(piloto);

                    return (
                      <button
                        key={piloto.driver_number || piloto.name_acronym || piloto.full_name || index}
                        ref={(el) => (cardRefs.current[index] = el)}
                        type="button"
                        onClick={() => handleClickPiloto(piloto)}
                        className="timing-row w-full grid-cols-[3rem_1fr_auto] text-left md:grid-cols-[4rem_4.5rem_1fr_1fr_5rem_5rem]"
                        style={{ borderLeft: `4px solid ${teamColor}` }}
                      >
                        <span className="data-value text-f1-copper">{piloto.position ? `P${piloto.position}` : '-'}</span>
                        <span className="hidden font-mono text-sm font-bold text-white/80 md:block">#{piloto.driver_number || '?'}</span>
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="relative h-10 w-10 shrink-0 overflow-hidden border border-white/15 bg-black/35">
                            {photo ? (
                              <img
                                src={photo}
                                alt=""
                                className="h-full w-full object-cover object-top"
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-white/45">
                                <User className="h-4 w-4" />
                              </span>
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-white">{piloto.full_name}</span>
                            <span className="flex items-center gap-2 text-xs text-white/45 md:hidden">
                              {flag && <img src={flag} alt="" className="h-3 w-4 object-cover" />}
                              #{piloto.driver_number || '?'} · {piloto.team_name}
                            </span>
                          </span>
                        </span>
                        <span className="hidden min-w-0 items-center gap-2 md:flex">
                          <img
                            src={getTeamLogo(piloto.team_name)}
                            alt=""
                            className="h-5 w-5 object-contain"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="truncate text-sm text-white/70">{piloto.team_name}</span>
                        </span>
                        <span className="data-value justify-self-end md:justify-self-start">{piloto.points || 0}</span>
                        <span className="hidden data-value md:block">{piloto.wins || 0}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      {shouldRenderModal && pilotoSeleccionado && (
        <>
          <button
            type="button"
            ref={modalBackdropRef}
            onClick={handleCerrarModal}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            aria-label="Cerrar ficha de piloto"
            style={{ opacity: 0 }}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <div
              ref={modalContentRef}
              className="glass p-4 sm:p-7 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
                style={{
                  opacity: 0,
                  background: pilotoSeleccionado.team_colour
                    ? `linear-gradient(135deg, rgba(${hexToRgb(pilotoSeleccionado.team_colour).r}, ${hexToRgb(pilotoSeleccionado.team_colour).g}, ${hexToRgb(pilotoSeleccionado.team_colour).b}, 0.1) 0%, rgba(0, 0, 0, 0.8) 100%)`
                    : undefined,
                  borderColor: pilotoSeleccionado.team_colour
                    ? `rgba(${hexToRgb(pilotoSeleccionado.team_colour).r}, ${hexToRgb(pilotoSeleccionado.team_colour).g}, ${hexToRgb(pilotoSeleccionado.team_colour).b}, 0.25)`
                    : undefined,
                  boxShadow: pilotoSeleccionado.team_colour
                    ? `0 20px 40px rgba(${hexToRgb(pilotoSeleccionado.team_colour).r}, ${hexToRgb(pilotoSeleccionado.team_colour).g}, ${hexToRgb(pilotoSeleccionado.team_colour).b}, 0.2)`
                  : undefined
              }}
            >
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-start space-x-4 sm:space-x-6">
                  {selectedDriverPhoto ? (
                    <div
                      ref={modalImageRef}
                      className="w-28 h-32 sm:w-32 sm:h-36 overflow-hidden bg-gradient-f1 shadow-2xl shadow-f1-red/20 flex-shrink-0 border border-white/15"
                      style={{ opacity: 0 }}
                    >
                      <img
                        src={selectedDriverPhoto}
                        alt={pilotoSeleccionado.full_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                      <div
                        className="w-full h-full bg-gradient-f1 items-center justify-center hidden"
                        style={{ display: 'none' }}
                      >
                        <span className="text-5xl font-bold text-white">
                          {pilotoSeleccionado.driver_number}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={modalImageRef}
                      className="w-28 h-32 sm:w-32 sm:h-36 bg-gradient-f1 flex items-center justify-center shadow-2xl shadow-f1-red/20 flex-shrink-0 border border-white/15"
                      style={{ opacity: 0 }}
                    >
                      <span className="text-5xl font-bold text-white">
                        {pilotoSeleccionado.driver_number}
                      </span>
                    </div>
                  )}

                  <div className="flex-1">
                    <p className="data-label mb-2">Ficha de piloto</p>
                    <h2 className="text-4xl sm:text-5xl font-racing italic text-white leading-none mb-2">
                      {pilotoSeleccionado.full_name}
                    </h2>
                    <p className="text-white/60 text-base">
                      {pilotoSeleccionado.team_name || 'Equipo no disponible'}
                    </p>
                  </div>
                </div>

                <button
                  ref={modalCloseButtonRef}
                  onClick={handleCerrarModal}
                  onMouseEnter={(e) => handleCloseHover(e, true)}
                  onMouseLeave={(e) => handleCloseHover(e, false)}
                  className="w-11 h-11 border border-white/10 bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
                  aria-label="Cerrar modal"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Perfil básico */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {basicStats.map((stat, index) => (
                  <div
                    key={stat.label}
                    ref={(el) => (modalStatsRef.current[index] = el)}
                    onMouseEnter={(e) => handleStatHover(e, true, pilotoSeleccionado.team_colour)}
                    onMouseLeave={(e) => handleStatHover(e, false, pilotoSeleccionado.team_colour)}
                    className="glass-dark p-4 relative overflow-hidden cursor-pointer"
                    style={{ opacity: 0 }}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      {stat.flag ? (
                        <img
                          src={stat.flag}
                          alt={`Bandera de ${stat.value}`}
                          className="w-5 h-4 rounded-sm object-cover shadow-sm"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <stat.icon
                          className="w-4 h-4"
                          style={{ color: pilotoSeleccionado.team_colour ? normalizeTeamHex(pilotoSeleccionado.team_colour) : '#ef4444' }}
                        />
                      )}
                      <p className="text-white/50 text-xs">{stat.label}</p>
                    </div>
                    <p className="text-white font-bold text-xl">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Rendimiento temporada */}
              <div className="glass-dark p-4 sm:p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-300" />
                    Rendimiento {selectedYear}
                  </h3>
                  <span className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Datos temporada
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {performanceStats.map((stat, index) => (
                    <div
                      key={stat.label}
                      ref={(el) => (modalStatsRef.current[index + basicStats.length] = el)}
                      onMouseEnter={(e) => handleStatHover(e, true, pilotoSeleccionado.team_colour)}
                      onMouseLeave={(e) => handleStatHover(e, false, pilotoSeleccionado.team_colour)}
                      className="border border-white/10 bg-black/25 px-3 py-3"
                      style={{ opacity: 0 }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <stat.icon className={`w-4 h-4 ${stat.tone}`} />
                        <p className="text-[11px] text-white/55 uppercase tracking-wide">{stat.label}</p>
                      </div>
                      <p className="text-white font-extrabold text-xl leading-tight">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team Info */}
              {pilotoSeleccionado.team_name && pilotoSeleccionado.team_colour && (
                <div
                  ref={modalTeamRef}
                  className="glass-dark p-6 mb-6 relative overflow-hidden"
                  style={{ opacity: 0 }}
                >
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                    <Shield
                      className="w-5 h-5"
                      style={{ color: normalizeTeamHex(pilotoSeleccionado.team_colour) }}
                    />
                    <span>Información del Equipo</span>
                  </h3>

                  <div className="flex items-center space-x-4">
                    <div
                      className="w-16 h-16 shadow-lg relative bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden"
                      style={{
                        boxShadow: `0 8px 20px rgba(${hexToRgb(pilotoSeleccionado.team_colour).r}, ${hexToRgb(pilotoSeleccionado.team_colour).g}, ${hexToRgb(pilotoSeleccionado.team_colour).b}, 0.4)`
                      }}
                    >
                      <img
                        src={getTeamLogo(pilotoSeleccionado.team_name)}
                        alt={`Logo ${pilotoSeleccionado.team_name}`}
                        className="w-12 h-12 object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.style.background = `linear-gradient(135deg, #${pilotoSeleccionado.team_colour}, rgba(${hexToRgb(pilotoSeleccionado.team_colour).r}, ${hexToRgb(pilotoSeleccionado.team_colour).g}, ${hexToRgb(pilotoSeleccionado.team_colour).b}, 0.7))`;
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-lg">
                        {pilotoSeleccionado.team_name}
                      </p>
                      <p className="text-white/50 text-sm">Equipo oficial de F1</p>
                    </div>
                  </div>

                  {/* Shimmer effect */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"
                    style={{ animation: 'shimmer 2s ease-in-out infinite' }}
                  />
                </div>
              )}

              {/* Info Note */}
              <div className="glass-dark p-4 flex items-start space-x-3">
                <Info className="w-5 h-5 text-f1-red flex-shrink-0 mt-0.5" />
                <p className="text-white/70 text-sm">
                  Perfil y métricas de la temporada {selectedYear} con datos oficiales de OpenF1 y Ergast/Jolpica.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Pilotos;
