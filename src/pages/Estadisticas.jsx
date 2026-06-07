import { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart2,
  Trophy,
  CalendarDays,
  Timer,
  Target,
  Building2,
  Users,
  User
} from 'lucide-react';
import gsap from 'gsap';
import { getStatistics, getChampionshipStandings } from '../services/openf1Service';
import { getTeamColor, getDriverTeamColor } from '../utils/chartColors';
import { getDriverPhoto, getTeamLogo } from '../utils/formatUtils';
import { useYear } from '../contexts/YearContext';
import Loader from '../components/ui/Loader';

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

const withTimeout = (promise, label, timeoutMs = 18000) => (
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} no respondió a tiempo`)), timeoutMs);
    })
  ])
);

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

        const [statisticsResult, standingsResult] = await Promise.allSettled([
          withTimeout(getStatistics({ signal, year: statsYear }), 'Estadísticas'),
          withTimeout(getChampionshipStandings({ signal, year: statsYear }), 'Clasificación')
        ]);

        if (signal.aborted) return;

        const statistics = statisticsResult.status === 'fulfilled' ? statisticsResult.value : {};
        const standings = standingsResult.status === 'fulfilled' ? standingsResult.value : { constructors: [], drivers: [] };
        const rejectedReasons = [statisticsResult, standingsResult]
          .filter((result) => result.status === 'rejected')
          .map((result) => result.reason?.message)
          .filter(Boolean);

        setStats(statistics || {});
        setChampionship(standings || { constructors: [], drivers: [] });
        setError(rejectedReasons.length > 0 ? rejectedReasons.join(' · ') : null);
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

  const closestTeamBattle = useMemo(() => {
    const battles = championshipConstructors
      .map((team) => {
        const drivers = Array.isArray(team?.drivers)
          ? [...team.drivers].sort((a, b) => Number(b?.points || 0) - Number(a?.points || 0))
          : [];
        if (drivers.length < 2) return null;

        return {
          team: team.team_name || 'Equipo',
          gap: Math.abs(Number(drivers[0]?.points || 0) - Number(drivers[1]?.points || 0))
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.gap - b.gap);

    return battles[0] || null;
  }, [championshipConstructors]);

  const remainingRaces = Math.max(0, Number(stats?.totalRaces || 0) - Number(stats?.completedRaces || 0));

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
    },
    {
      label: 'Duelo interno',
      value: closestTeamBattle ? `${closestTeamBattle.team} · ${formatMetric(closestTeamBattle.gap)} pts` : 'Sin datos',
      icon: Trophy,
      tone: '#a78bfa'
    },
    {
      label: 'Carreras pendientes',
      value: `${formatMetric(remainingRaces)}`,
      icon: CalendarDays,
      tone: '#fb7185'
    }
  ];

  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.from(headerRef.current, { y: 18, duration: 0.45, ease: 'power2.out' });
      }
    });

    return () => ctx.revert();
  }, [loading, statsYear]);

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
    <div className="control-page">
      <div className="race-shell control-shell">
        <aside className="race-rail flex min-h-0 flex-col overflow-y-auto" data-lenis-prevent>
          <div className="hud-kicker mb-5">
            <BarChart2 className="h-3.5 w-3.5" />
            Datos
          </div>
          <h1 className="font-racing text-[2rem] italic leading-none text-white">Estadísticas</h1>
          <p className="mt-3 text-sm text-white/58">
            Indicadores de campeonato, brechas clave y próximas carreras en una vista de análisis.
          </p>
          <span className={`mt-5 inline-flex text-[11px] border px-3 py-1 font-mono uppercase tracking-[0.14em] ${dataSourceTone}`}>
            {dataSourceLabel}
          </span>

          <div className="mt-6 min-h-0 space-y-3 overflow-y-auto pr-1" data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch>
            {insightCards.map((card) => (
              <div key={`rail-${card.label}`} className="border border-white/10 bg-black/20 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <card.icon className="h-4 w-4" style={{ color: card.tone }} />
                  <p className="data-label">{card.label}</p>
                </div>
                <p className="data-value text-2xl">{card.value}</p>
              </div>
            ))}
          </div>
        </aside>

        <main className="control-main">
          <header ref={headerRef} className="race-module shrink-0">
            <div className="relative z-10">
              <div className="hud-kicker mb-4">Temporada {statsYear}</div>
              <h2 className="font-racing text-4xl italic leading-none text-white sm:text-6xl">Estadísticas</h2>
              <p className="mt-3 max-w-3xl text-sm text-white/60">
                Vista centrada en contexto competitivo real: diferencia por el título, ritmo de constructores y calendario inmediato.
              </p>
            </div>
          </header>

          {error && (
            <div className="shrink-0 border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              {error}
            </div>
          )}

          <div className="control-scroll space-y-4" data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch>
            <section ref={driversRef} className="race-module">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <h3 className="text-2xl font-racing italic text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Batalla por el titulo
            </h3>
            <span className="data-label">Top 10 pilotos</span>
          </div>

          <p className="text-white/60 text-sm mt-2 mb-5">
            Diferencia frente al líder, victorias y puntos para leer la lucha por el campeonato.
          </p>

          <div className="space-y-3">
            {driverRows.map((driver) => (
              <div
                key={`${driver.position}-${driver.code}-${driver.name}`}
                data-driver-row
                className="border border-white/10 bg-black/25 px-3 sm:px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center text-sm font-mono font-bold border"
                    style={{
                      color: driver.color,
                      borderColor: `${driver.color}88`,
                      backgroundColor: `${driver.color}20`
                    }}
                  >
                    {driver.position}
                  </div>

                  <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden border border-white/20 bg-black/40">
                    {driver.photo ? (
                      <img
                        src={driver.photo}
                        alt={driver.name}
                        className="h-full w-full object-cover object-top"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-white/45">
                        <User className="h-4 w-4" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 w-[40%] sm:w-[32%]">
                    <p className="text-white font-semibold truncate">{driver.name}</p>
                    <p className="text-white/50 text-xs uppercase tracking-wide truncate">{driver.team}</p>
                  </div>

                  <div className="hidden md:block flex-1">
                    <div className="h-2 bg-white/10 overflow-hidden">
                      <div
                        className="h-full"
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

            <section ref={constructorsRef} className="race-module">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <h3 className="text-2xl font-racing italic text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-cyan-300" />
              Constructores
            </h3>
            <span className="data-label">
              {constructorRows.length} equipos
            </span>
          </div>

          <p className="text-white/60 text-sm mt-2 mb-5">
            Puntos, victorias y piloto referencia para medir el pulso entre constructores.
          </p>

          <div className="space-y-3">
            {constructorRows.map((team) => {
              const ratio = maxConstructorPoints > 0 ? (team.points / maxConstructorPoints) * 100 : 0;
              return (
                <div
                  key={`${team.position}-${team.name}`}
                  data-constructor-row
                  className="border border-white/10 bg-black/25 px-3 sm:px-4 py-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                    <div className="flex items-center gap-3 min-w-[250px]">
                      <div
                        className="w-10 h-10 flex items-center justify-center text-sm font-mono font-bold border"
                        style={{
                          color: team.color,
                          borderColor: `${team.color}88`,
                          backgroundColor: `${team.color}20`
                        }}
                      >
                        {team.position}
                      </div>

                      <div className="w-11 h-11 overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center">
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
                      <div className="h-2.5 bg-white/10 overflow-hidden">
                        <div
                          className="h-full"
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
                        <p className="text-[10px] uppercase tracking-wider text-white/50">Pts</p>
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <section ref={upcomingRef} className="race-module">
            <div className="flex items-center gap-2 mb-5">
              <CalendarDays className="w-5 h-5 text-f1-red" />
              <h3 className="text-xl font-racing italic text-white">Próximos Grandes Premios</h3>
            </div>

            {upcomingMeetings.length > 0 ? (
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="border border-white/10 bg-black/20 px-4 py-3">
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
              <div className="border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/60">
                No hay próximas carreras disponibles todavía.
              </div>
            )}
              </section>

              <section ref={insightsRef} className="race-module">
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-5 h-5 text-amber-400" />
              <h3 className="text-xl font-racing italic text-white">Indicadores competitivos</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {insightCards.map((card) => (
                <div
                  key={card.label}
                  data-insight-card
                  className="border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <card.icon className="w-4 h-4" style={{ color: card.tone }} />
                    <p className="text-xs uppercase tracking-wider text-white/55">{card.label}</p>
                  </div>
                  <p className="data-value text-2xl">{card.value}</p>
                </div>
              ))}
            </div>
              </section>
            </div>

            <footer className="mt-8 text-center">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">
                Datos combinados de OpenF1 y Ergast · Actualización por temporada
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Estadisticas;
