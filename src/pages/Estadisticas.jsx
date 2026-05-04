import { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart2,
  Trophy,
  CalendarDays,
  Timer,
  Target,
  Building2,
  Users
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getStatistics, getChampionshipStandings } from '../services/openf1Service';
import { getTeamColor, getDriverTeamColor } from '../utils/chartColors';
import { getDriverPhoto, getTeamLogo } from '../utils/formatUtils';
import { useYear } from '../contexts/YearContext';
import Loader from '../components/ui/Loader';

gsap.registerPlugin(ScrollTrigger);

const CONSTRUCTORS_DISPLAY_LIMIT = 11;
const COMPACT_DATE_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short'
});

const isLocalDriverPhoto = (path) => typeof path === 'string' && path.startsWith('/drivers/');

const getSafeDriverPhoto = (driver) => {
  const photo = getDriverPhoto(driver);
  return isLocalDriverPhoto(photo) ? photo : null;
};

const formatCompactDate = (value) => {
  if (!value) return 'Fecha por confirmar';
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return 'Fecha por confirmar';
  return COMPACT_DATE_FORMATTER.format(parsedDate);
};

const formatMetric = (value) => Number(value || 0).toLocaleString('es-ES');

const getDriverName = (driverStanding) => {
  const given = driverStanding?.driver?.givenName || '';
  const family = driverStanding?.driver?.familyName || '';
  const fullName = `${given} ${family}`.trim();
  return fullName || driverStanding?.driver?.code || 'Piloto';
};

const getDriverInitials = (driverStanding) => {
  const name = getDriverName(driverStanding);
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const buildDriverStandingFromChampionship = (driver, index) => {
  const fullName = String(driver?.full_name || 'Piloto').trim() || 'Piloto';
  const parts = fullName.split(' ').filter(Boolean);
  const givenName = parts.slice(0, -1).join(' ') || parts[0] || 'Piloto';
  const familyName = parts.length > 1 ? parts[parts.length - 1] : '';

  return {
    position: Number(driver?.position || 0) || index + 1,
    points: Number(driver?.points || 0),
    wins: Number(driver?.wins || 0),
    driver: {
      permanentNumber: driver?.driver_number || null,
      code: driver?.name_acronym || (familyName ? familyName.slice(0, 3).toUpperCase() : 'DRV'),
      givenName,
      familyName
    },
    constructor: {
      name: driver?.team_name || 'Equipo'
    }
  };
};

const Estadisticas = () => {
  const [stats, setStats] = useState({});
  const [championship, setChampionship] = useState({ constructors: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { selectedYear } = useYear();
  const statsYear = selectedYear;

  const headerRef = useRef(null);
  const driversRef = useRef(null);
  const constructorsRef = useRef(null);
  const upcomingRef = useRef(null);
  const insightsRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statistics, standings] = await Promise.all([
          getStatistics({ signal, year: statsYear }),
          getChampionshipStandings({ signal, year: statsYear })
        ]);

        if (signal.aborted) return;

        setStats(statistics || {});
        setChampionship(standings || { constructors: [] });
      } catch (loadError) {
        if (loadError?.name === 'AbortError' || loadError?.code === 'ERR_CANCELED') {
          return;
        }
        setError('No se pudieron cargar las estadísticas de la temporada.');
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadStats();
    return () => controller.abort();
  }, [statsYear]);

  const championshipDriverStandings = useMemo(() => {
    const championshipDrivers = Array.isArray(championship?.drivers) ? championship.drivers : [];
    return championshipDrivers.map((driver, index) => buildDriverStandingFromChampionship(driver, index));
  }, [championship]);

  const driverStandings = useMemo(() => {
    const topDrivers = Array.isArray(stats?.topDrivers) ? stats.topDrivers : [];
    if (topDrivers.length > 0) return topDrivers;
    return championshipDriverStandings;
  }, [stats, championshipDriverStandings]);

  const championshipConstructors = useMemo(
    () => (Array.isArray(championship?.constructors) ? championship.constructors : []),
    [championship]
  );

  const constructorsByName = useMemo(() => {
    const entries = championshipConstructors.map((team) => [
      String(team.team_name || '').trim().toLowerCase(),
      team
    ]);
    return new Map(entries);
  }, [championshipConstructors]);

  const leader = driverStandings[0] || null;
  const secondDriver = driverStandings[1] || null;
  const leaderPoints = Number(leader?.points || 0);

  const driverRows = useMemo(() => {
    const sortedStandings = [...driverStandings].sort((first, second) => {
      const firstPosition = Number(first?.position || 0);
      const secondPosition = Number(second?.position || 0);

      if (firstPosition > 0 && secondPosition > 0) return firstPosition - secondPosition;

      const pointsDiff = Number(second?.points || 0) - Number(first?.points || 0);
      if (pointsDiff !== 0) return pointsDiff;

      return getDriverName(first).localeCompare(getDriverName(second), 'es', { sensitivity: 'base' });
    });

    return sortedStandings.slice(0, 10).map((standing, index) => {
      const points = Number(standing?.points || 0);
      const gap = Math.max(0, leaderPoints - points);
      const color = getDriverTeamColor(standing);
      const ratio = leaderPoints > 0 ? (points / leaderPoints) * 100 : 0;

      return {
        position: Number(standing?.position) || index + 1,
        name: getDriverName(standing),
        code: standing?.driver?.code || '---',
        team: standing?.constructor?.name || 'Equipo',
        points,
        wins: Number(standing?.wins || 0),
        gap,
        color,
        ratio,
        photo: getSafeDriverPhoto(standing?.driver),
        initials: getDriverInitials(standing)
      };
    });
  }, [driverStandings, leaderPoints]);

  const constructorRows = useMemo(() => {
    const fromStats = Array.isArray(stats?.topConstructors) ? stats.topConstructors : [];

    const source = fromStats.length > 0
      ? fromStats.map((constructorStanding, index) => {
        const name = constructorStanding?.constructor?.name || 'Equipo';
        return {
          position: Number(constructorStanding?.position) || index + 1,
          name,
          points: Number(constructorStanding?.points || 0),
          wins: Number(constructorStanding?.wins || 0),
          color: getTeamColor(name)
        };
      })
      : championshipConstructors.map((team, index) => {
        const name = team?.team_name || 'Equipo';
        return {
          position: Number(team?.position) || index + 1,
          name,
          points: Number(team?.points || 0),
          wins: Number(team?.wins || 0),
          color: getTeamColor(name)
        };
      });

    const sorted = [...source].sort((a, b) => b.points - a.points).slice(0, CONSTRUCTORS_DISPLAY_LIMIT);

    return sorted.map((team, index) => {
      const teamData = constructorsByName.get(String(team.name).toLowerCase());
      const topTeamDriver = Array.isArray(teamData?.drivers)
        ? teamData.drivers.reduce((bestDriver, driver) => (
          Number(driver?.points || 0) > Number(bestDriver?.points || 0) ? driver : bestDriver
        ), null)
        : null;

      return {
        ...team,
        position: team.position || index + 1,
        leadDriver: topTeamDriver?.full_name || topTeamDriver?.name_acronym || null,
        logo: getTeamLogo(team.name)
      };
    });
  }, [stats, championshipConstructors, constructorsByName]);

  const maxConstructorPoints = useMemo(
    () => constructorRows.reduce((max, team) => Math.max(max, team.points), 0),
    [constructorRows]
  );

  const titleGap = leader && secondDriver
    ? Math.max(0, Number(leader.points || 0) - Number(secondDriver.points || 0))
    : 0;

  const constructorSecond = constructorRows[1] || null;
  const constructorGap = constructorRows[0] && constructorSecond
    ? Math.max(0, constructorRows[0].points - constructorSecond.points)
    : 0;

  const contendersWithin50 = driverRows.filter((driver) => driver.gap <= 50).length;
  const p10Spread = driverRows.length >= 10
    ? Math.max(0, driverRows[0].points - driverRows[9].points)
    : 0;

  const upcomingMeetings = useMemo(() => {
    const source = Array.isArray(stats?.upcomingMeetings) ? stats.upcomingMeetings : [];
    return source.slice(0, 4).map((meeting, index) => ({
      id: meeting?.meeting_key || `${meeting?.meeting_name || 'meeting'}-${index}`,
      name: meeting?.meeting_name || meeting?.race_name || 'Gran Premio',
      round: meeting?.round ? `R${meeting.round}` : null,
      circuit: meeting?.circuit_short_name || meeting?.location || 'Circuito por confirmar',
      location: meeting?.country_name || meeting?.location || 'TBA',
      date: formatCompactDate(meeting?.date_start)
    }));
  }, [stats]);

  const dataSourceLabel = stats?.dataSource === 'real'
    ? 'Clasificación oficial'
    : stats?.dataSource === 'base'
      ? 'Datos de temporada'
      : 'Actualización de temporada';

  const dataSourceTone = stats?.dataSource === 'real'
    ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30'
    : 'bg-amber-400/20 text-amber-300 border-amber-400/30';

  const insightCards = [
    {
      label: 'Gap por el título',
      value: titleGap > 0 ? `${formatMetric(titleGap)} pts` : 'Empate técnico',
      icon: Timer,
      tone: '#ef4444'
    },
    {
      label: 'Gap constructores',
      value: constructorGap > 0 ? `${formatMetric(constructorGap)} pts` : 'Sin diferencia',
      icon: Building2,
      tone: '#3b82f6'
    },
    {
      label: 'Pilotos a <50 pts',
      value: `${formatMetric(contendersWithin50)}`,
      icon: Users,
      tone: '#10b981'
    },
    {
      label: 'Brecha P1 vs P10',
      value: p10Spread > 0 ? `${formatMetric(p10Spread)} pts` : 'N/A',
      icon: Target,
      tone: '#f59e0b'
    }
  ];

  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }
        );
      }

      if (driversRef.current) {
        const rows = driversRef.current.querySelectorAll('[data-driver-row]');
        gsap.fromTo(
          rows,
          { opacity: 0, x: -22 },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            stagger: 0.05,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: driversRef.current,
              start: 'top 78%'
            }
          }
        );
      }

      if (constructorsRef.current) {
        const rows = constructorsRef.current.querySelectorAll('[data-constructor-row]');
        gsap.fromTo(
          rows,
          { opacity: 0, x: 22 },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            stagger: 0.06,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: constructorsRef.current,
              start: 'top 80%'
            }
          }
        );
      }

      if (upcomingRef.current) {
        gsap.fromTo(
          upcomingRef.current,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: upcomingRef.current,
              start: 'top 84%'
            }
          }
        );
      }

      if (insightsRef.current) {
        const cards = insightsRef.current.querySelectorAll('[data-insight-card]');
        gsap.fromTo(
          cards,
          { opacity: 0, y: 22, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.55,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: insightsRef.current,
              start: 'top 84%'
            }
          }
        );
      }
    });

    return () => ctx.revert();
  }, [loading, statsYear, driverRows.length, constructorRows.length, upcomingMeetings.length]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Loader mensaje="Montando tablero de estadísticas…" />
      </div>
    );
  }

  if (error && driverRows.length === 0 && constructorRows.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="glass rounded-2xl p-8 text-center border border-red-500/30">
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-f1-dark relative overflow-hidden pb-24">
      <div className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top,rgba(225,6,0,0.18)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute -top-24 right-[-6rem] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-[-5rem] h-64 w-64 rounded-full bg-f1-red/12 blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 relative z-10">
        <header ref={headerRef} className="mb-8 sm:mb-10" style={{ opacity: 0 }}>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.25em] uppercase text-f1-red">
              <BarChart2 className="w-4 h-4" />
              Race Intelligence
            </span>
            <span className={`text-[11px] border rounded-full px-3 py-1 ${dataSourceTone}`}>
              {dataSourceLabel}
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-racing tracking-tight text-white uppercase leading-none">
            Estadísticas
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white/80 to-white/30">
              Temporada {statsYear}
            </span>
          </h1>
          <p className="mt-4 text-white/65 max-w-3xl text-sm sm:text-base">
            Vista centrada en contexto competitivo real: diferencia por el título, ritmo de constructores y calendario inmediato.
          </p>
        </header>

        <section ref={driversRef} className="glass rounded-[2rem] p-6 sm:p-8 mb-8">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Batalla por el titulo
            </h3>
            <span className="text-xs uppercase tracking-[0.2em] text-white/45">Top 10 pilotos</span>
          </div>

          <p className="text-white/60 text-sm mt-2 mb-5">
            Clasificación única con diferencia real frente al líder, evitando gráficos duplicados de la misma métrica.
          </p>

          <div className="space-y-3">
            {driverRows.map((driver) => (
              <div
                key={`${driver.position}-${driver.code}-${driver.name}`}
                data-driver-row
                className="rounded-2xl border border-white/10 bg-black/25 px-3 sm:px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border"
                    style={{
                      color: driver.color,
                      borderColor: `${driver.color}88`,
                      backgroundColor: `${driver.color}20`
                    }}
                  >
                    {driver.position}
                  </div>

                  <div className="w-11 h-11 rounded-full overflow-hidden border border-white/20 bg-black/40 flex items-center justify-center">
                    {driver.photo ? (
                      <img
                        src={driver.photo}
                        alt={driver.name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <span className="text-xs font-bold text-white/70">{driver.initials}</span>
                    )}
                  </div>

                  <div className="min-w-0 w-[40%] sm:w-[32%]">
                    <p className="text-white font-semibold truncate">{driver.name}</p>
                    <p className="text-white/50 text-xs uppercase tracking-wide truncate">{driver.team}</p>
                  </div>

                  <div className="hidden md:block flex-1">
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(3, driver.ratio)}%`,
                          background: `linear-gradient(90deg, ${driver.color}, ${driver.color}99)`
                        }}
                      />
                    </div>
                  </div>

                  <div className="ml-auto flex items-end md:items-center gap-5">
                    <div className="text-right">
                      <p className="text-white text-xl font-black leading-none">{formatMetric(driver.points)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-white/50">
                        {driver.gap === 0 ? 'Lider' : `-${formatMetric(driver.gap)} pts`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-lg font-bold leading-none">{formatMetric(driver.wins)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-white/50">Victorias</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section ref={constructorsRef} className="glass rounded-[2rem] p-6 sm:p-8 mb-8">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-cyan-300" />
              Constructores
            </h3>
            <span className="text-xs uppercase tracking-[0.2em] text-white/45">
              {constructorRows.length} equipos
            </span>
          </div>

          <p className="text-white/60 text-sm mt-2 mb-5">
            Comparativa visual de puntos con referencia al líder. Se elimina la duplicación entre tarjeta y gráfica.
          </p>

          <div className="space-y-3">
            {constructorRows.map((team) => {
              const ratio = maxConstructorPoints > 0 ? (team.points / maxConstructorPoints) * 100 : 0;
              return (
                <div
                  key={`${team.position}-${team.name}`}
                  data-constructor-row
                  className="rounded-2xl border border-white/10 bg-black/25 px-3 sm:px-4 py-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                    <div className="flex items-center gap-3 min-w-[250px]">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border"
                        style={{
                          color: team.color,
                          borderColor: `${team.color}88`,
                          backgroundColor: `${team.color}20`
                        }}
                      >
                        {team.position}
                      </div>

                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center">
                        <img
                          src={team.logo}
                          alt={team.name}
                          className="w-8 h-8 object-contain"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{team.name}</p>
                        <p className="text-white/45 text-xs truncate">
                          {team.leadDriver ? `Piloto referencia: ${team.leadDriver}` : 'Sin detalle de pilotos'}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(4, ratio)}%`,
                            background: `linear-gradient(90deg, ${team.color}, ${team.color}99)`
                          }}
                        />
                      </div>
                    </div>

                    <div className="ml-auto flex items-end md:items-center gap-5">
                      <div className="text-right">
                        <p className="text-white text-xl font-black leading-none">{formatMetric(team.points)}</p>
                        <p className="text-[10px] uppercase tracking-wider text-white/50">PTS</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-lg font-bold leading-none">{formatMetric(team.wins)}</p>
                        <p className="text-[10px] uppercase tracking-wider text-white/50">Victorias</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section ref={upcomingRef} className="glass rounded-[2rem] p-6 sm:p-8" style={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-5">
              <CalendarDays className="w-5 h-5 text-f1-red" />
              <h3 className="text-xl font-bold text-white">Próximos Grandes Premios</h3>
            </div>

            {upcomingMeetings.length > 0 ? (
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{meeting.name}</p>
                        <p className="text-white/50 text-sm truncate">{meeting.circuit}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white text-sm font-semibold">{meeting.date}</p>
                        <p className="text-white/45 text-xs">{meeting.location}</p>
                      </div>
                    </div>
                    {meeting.round && (
                      <span className="inline-block mt-2 text-[10px] tracking-[0.2em] uppercase text-f1-red/90">
                        {meeting.round}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/60">
                No hay próximas carreras disponibles todavía.
              </div>
            )}
          </section>

          <section ref={insightsRef} className="glass rounded-[2rem] p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-5 h-5 text-amber-400" />
              <h3 className="text-xl font-bold text-white">Indicadores competitivos</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {insightCards.map((card) => (
                <div
                  key={card.label}
                  data-insight-card
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                  style={{ opacity: 0 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <card.icon className="w-4 h-4" style={{ color: card.tone }} />
                    <p className="text-xs uppercase tracking-wider text-white/55">{card.label}</p>
                  </div>
                  <p className="text-2xl font-black text-white">{card.value}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="mt-12 text-center">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">
            Datos combinados de OpenF1 y Ergast · Actualización por temporada
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Estadisticas;
