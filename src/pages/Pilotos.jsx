import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { getDrivers, getDriverStandings, getDriverSeasonStatsFromErgast } from '../services/openf1Service';
import CardPiloto from '../components/pilotos/CardPiloto';
import Loader from '../components/ui/Loader';
import { X, User, Flag, Hash, Shield, Info, Trophy, Medal, Target, Gauge, Timer, TrendingUp } from 'lucide-react';
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

  // Animación de entrada del header y grid
  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      // Header animation
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { opacity: 0, y: -30, scale: 0.9 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' }
        );

        const title = headerRef.current.querySelector('h1');
        const subtitle = headerRef.current.querySelector('p');
        const badge = headerRef.current.querySelector('.badge');

        if (title) {
          gsap.fromTo(title, { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: 0.8, delay: 0.2, ease: 'power3.out' });
        }
        if (badge) {
          gsap.fromTo(badge, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, delay: 0.5, ease: 'back.out(2)' });
        }
        if (subtitle) {
          gsap.fromTo(subtitle, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.4, ease: 'power2.out' });
        }
      }

      // Grid animation
      if (gridRef.current) {
        gsap.fromTo(
          gridRef.current,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.6, delay: 0.1, ease: 'power2.out' }
        );
      }

      // Cards stagger animation
      const validCards = cardRefs.current.filter(Boolean);
      if (validCards.length > 0) {
        gsap.fromTo(
          validCards,
          { opacity: 0, y: 50, rotateX: -15 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.5,
            stagger: 0.05,
            delay: 0.2,
            ease: 'power3.out',
          }
        );
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
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 overflow-x-hidden">
      <div ref={headerRef} className="mb-12 mt-4" style={{ opacity: 0 }}>
        <h1 className="text-6xl md:text-8xl font-racing text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-4 tracking-tight uppercase">
          PILOTOS
          <span className="inline-block ml-6 px-4 py-2 rounded-full border border-f1-red/30 bg-f1-red/10 text-xl font-sans text-f1-red font-bold align-middle shadow-[0_0_15px_rgba(225,6,0,0.2)]">
            T {selectedYear}
          </span>
        </h1>
        <p className="text-white/60 text-xl font-sans">
          La parrilla al completo de la temporada {selectedYear}
        </p>
      </div>

      {/* Grid de pilotos */}
      <div className="mb-6">
        {sortedPilotos.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-white/85 font-semibold mb-2">No hay pilotos disponibles todavía</p>
            <p className="text-white/60 text-sm">
              Estamos esperando la publicación oficial de la parrilla para la temporada {selectedYear}.
            </p>
          </div>
        ) : (
          <div
            ref={gridRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
            style={{ opacity: 0 }}
          >
            {sortedPilotos.map((piloto, index) => (
              <div
                key={piloto.driver_number || piloto.name_acronym || piloto.full_name || index}
                ref={(el) => (cardRefs.current[index] = el)}
                style={{ opacity: 0 }}
              >
                <CardPiloto
                  piloto={piloto}
                  onClick={() => handleClickPiloto(piloto)}
                />
              </div>
            ))}
          </div>
        )}
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
              className="glass rounded-3xl p-4 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
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
                      className="w-32 h-32 rounded-2xl overflow-hidden bg-gradient-f1 shadow-2xl shadow-f1-red/30 flex-shrink-0"
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
                      className="w-32 h-32 rounded-2xl bg-gradient-f1 flex items-center justify-center shadow-2xl shadow-f1-red/30 flex-shrink-0"
                      style={{ opacity: 0 }}
                    >
                      <span className="text-5xl font-bold text-white">
                        {pilotoSeleccionado.driver_number}
                      </span>
                    </div>
                  )}

                  <div className="flex-1">
                    <h2 className="text-4xl font-bold text-white mb-2">
                      {pilotoSeleccionado.full_name}
                    </h2>
                    <p className="text-white/60 text-lg">
                      {pilotoSeleccionado.team_name || 'Equipo no disponible'}
                    </p>
                  </div>
                </div>

                <button
                  ref={modalCloseButtonRef}
                  onClick={handleCerrarModal}
                  onMouseEnter={(e) => handleCloseHover(e, true)}
                  onMouseLeave={(e) => handleCloseHover(e, false)}
                  className="w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
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
                    className="glass-dark rounded-xl p-4 relative overflow-hidden cursor-pointer"
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
              <div className="glass-dark rounded-xl p-4 sm:p-5 mb-6">
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
                      className="rounded-xl border border-white/10 bg-black/25 px-3 py-3"
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
                  className="glass-dark rounded-xl p-6 mb-6 relative overflow-hidden"
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
                      className="w-16 h-16 rounded-xl shadow-lg relative bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden"
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
              <div className="glass-dark rounded-xl p-4 flex items-start space-x-3">
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
