import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Flag, Github, Shield, Trophy } from 'lucide-react';
import {
  getConstructorStandingsFromErgast,
  getDriverStandingsFromErgast,
  getRaces,
  getSeasonProgress
} from '../services/openf1Service';
import { getTotalRacesForYear } from '../services/config/apiConfig';
import { getTeamColor, getTeamLogo } from '../utils/formatUtils';
import { useYear } from '../contexts/YearContext';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long'
});

const formatDate = (dateValue) => {
  if (!dateValue) return 'Por confirmar';
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return 'Por confirmar';
  return DATE_FORMATTER.format(parsedDate);
};

const formatPoints = (value) => Number(value || 0).toLocaleString('es-ES');

const withTimeout = (promise, fallback, timeoutMs = 5500) => (
  Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    })
  ])
);

const getDriverLabel = (driver) => {
  if (!driver) return 'Sin datos';
  return driver.full_name || [driver.driver?.givenName, driver.driver?.familyName].filter(Boolean).join(' ') || driver.name_acronym || 'Piloto';
};

const getTeamLabel = (team) => {
  if (!team) return 'Sin datos';
  return team.team_name || team.constructor?.name || 'Equipo';
};

const hasRealStanding = (standing) => (
  Boolean(standing) && (Number(standing.points || 0) > 0 || Number(standing.position || 0) === 1)
);

const Inicio = () => {
  const { selectedYear } = useYear();
  const [seasonProgress, setSeasonProgress] = useState(null);
  const [standings, setStandings] = useState({ drivers: [], constructors: [] });
  const [races, setRaces] = useState([]);
  const [leaderLogoFailed, setLeaderLogoFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchData = async () => {
      try {
        const [progressResult, driversResult, constructorsResult, racesResult] = await Promise.allSettled([
          withTimeout(getSeasonProgress({ year: selectedYear }), null),
          withTimeout(getDriverStandingsFromErgast({ signal, year: selectedYear }), []),
          withTimeout(getConstructorStandingsFromErgast({ signal, year: selectedYear }), []),
          withTimeout(getRaces({ signal, year: selectedYear }), [])
        ]);

        if (signal.aborted) return;

        setSeasonProgress(progressResult.status === 'fulfilled' ? progressResult.value : null);
        setStandings({
          drivers: driversResult.status === 'fulfilled' && Array.isArray(driversResult.value) ? driversResult.value : [],
          constructors: constructorsResult.status === 'fulfilled' && Array.isArray(constructorsResult.value) ? constructorsResult.value : []
        });
        setRaces(racesResult.status === 'fulfilled' ? racesResult.value : []);
      } catch (error) {
        if (!signal.aborted) console.warn('No se pudieron actualizar los datos de inicio:', error);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [selectedYear]);

  const progressPercent = Number(seasonProgress?.progressPercentage || 0);

  const championshipLeader = useMemo(() => {
    const drivers = Array.isArray(standings?.drivers) ? standings.drivers : [];
    const leader = [...drivers].sort((a, b) => {
      const positionDiff = Number(a?.position || 999) - Number(b?.position || 999);
      if (positionDiff !== 0) return positionDiff;
      return Number(b?.points || 0) - Number(a?.points || 0);
    })[0] || null;
    return hasRealStanding(leader) ? leader : null;
  }, [standings]);

  const constructorLeader = useMemo(() => {
    const constructors = Array.isArray(standings?.constructors) ? standings.constructors : [];
    const leader = [...constructors].sort((a, b) => {
      const positionDiff = Number(a?.position || 999) - Number(b?.position || 999);
      if (positionDiff !== 0) return positionDiff;
      return Number(b?.points || 0) - Number(a?.points || 0);
    })[0] || null;
    return hasRealStanding(leader) ? leader : null;
  }, [standings]);

  const nextRace = useMemo(() => {
    const now = Date.now();
    return [...(Array.isArray(races) ? races : [])]
      .filter((race) => new Date(race.date_start).getTime() > now)
      .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))[0] || null;
  }, [races]);

  const totalRaces = Number(seasonProgress?.totalRaces || getTotalRacesForYear(selectedYear) || races.length || 24);
  const completedRaces = Number(seasonProgress?.completedRaces || 0);
  const remainingRaces = Number(seasonProgress?.remainingRaces ?? Math.max(0, totalRaces - completedRaces));
  const leaderTeamName = getTeamLabel(constructorLeader);
  const leaderTeamColor = getTeamColor(leaderTeamName);
  const leaderTeamLogo = getTeamLogo(leaderTeamName);
  const hasConstructorLeader = hasRealStanding(constructorLeader);
  const nextRaceName = nextRace?.race_name || nextRace?.meeting_name || nextRace?.circuit_short_name || 'Por confirmar';
  const nextRacePlace = nextRace?.circuit_short_name || nextRace?.location || 'Circuito pendiente';

  useEffect(() => {
    setLeaderLogoFailed(false);
  }, [leaderTeamLogo]);

  return (
    <div className="control-page">
      <div className="race-shell">
        <aside className="race-rail flex min-h-0 flex-col overflow-hidden">
          <div className="hud-kicker mb-5">
            <Flag className="h-3.5 w-3.5" />
            Inicio
          </div>
          <h1 className="font-racing text-[2rem] italic leading-none text-white">F1 Data Explorer</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/62">
            Un vistazo rápido a la temporada {selectedYear}: quién manda, cuánto queda y cuál es la próxima parada.
          </p>

          <div className="relative mt-7 overflow-hidden border border-white/10 bg-black/20 p-4">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
              <div className="h-full bg-gradient-to-r from-f1-red to-f1-copper" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="data-label">Temporada</p>
            <p className="mt-2 font-racing text-6xl italic leading-none text-white">{selectedYear}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div>
                <p className="data-value text-2xl">{completedRaces}</p>
                <p className="data-label">Hechas</p>
              </div>
              <div>
                <p className="data-value text-2xl text-f1-copper">{remainingRaces}</p>
                <p className="data-label">Quedan</p>
              </div>
            </div>
          </div>

          <div className="mt-4 border border-white/10 bg-white/[0.035] p-4">
            <p className="data-label">Próxima parada</p>
            <p className="mt-2 truncate text-sm font-semibold text-white">{nextRaceName}</p>
            <p className="mt-1 text-xs text-white/45">{formatDate(nextRace?.date_start)}</p>
          </div>

          <a
            href="https://github.com/Laanga/F1DataExplorer"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-mono uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-f1-copper/40 hover:text-white"
          >
            <Github className="h-4 w-4" />
            Repositorio
          </a>
        </aside>

        <main className="control-main">
          <section
            className="race-module min-h-[430px] shrink-0 overflow-hidden border-l-4"
            style={{ borderLeftColor: leaderTeamColor }}
          >
            <div
              className="absolute inset-0 opacity-70"
              style={{
                background: `linear-gradient(115deg, rgba(0,0,0,0.18), rgba(0,0,0,0.86) 52%), linear-gradient(145deg, ${leaderTeamColor}24, transparent 48%)`
              }}
            />
            <div className="absolute -right-10 top-8 h-64 w-64 opacity-[0.16] sm:h-80 sm:w-80">
              {hasConstructorLeader ? (
                <img
                  src={leaderTeamLogo}
                  alt=""
                  className="h-full w-full object-contain opacity-80 [filter:drop-shadow(0_0_34px_rgba(255,255,255,0.22))]"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
            </div>
            <div className="absolute bottom-0 left-[42%] hidden h-[130%] w-24 -translate-x-1/2 rotate-[18deg] border-x border-white/10 bg-white/[0.025] lg:block">
              <div className="h-full w-full bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0_2px,transparent_2px_34px)]" />
            </div>
            <div className="absolute bottom-6 right-8 hidden grid-cols-6 gap-1 opacity-25 lg:grid">
              {Array.from({ length: 24 }).map((_, index) => (
                <span
                  key={`flag-${index}`}
                  className={`h-4 w-4 ${index % 2 === Math.floor(index / 6) % 2 ? 'bg-white' : 'bg-transparent'} border border-white/10`}
                />
              ))}
            </div>

            <div className="relative z-10 grid h-full gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div className="max-w-3xl self-start">
                <div className="hud-kicker mb-5">
                  <Trophy className="h-3.5 w-3.5" />
                  Resumen de temporada
                </div>
                <h2 className="font-racing text-5xl italic leading-none text-white sm:text-7xl">
                  La temporada en un vistazo
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70">
                  Liderato, próxima carrera y avance del calendario sin entrar todavía en el detalle completo.
                </p>
              </div>

              <div className="grid gap-3 self-end sm:grid-cols-2 lg:grid-cols-1">
                <div className="border border-white/10 bg-black/35 p-4 backdrop-blur">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="data-label">Piloto líder</p>
                    <Trophy className="h-4 w-4 text-f1-copper" />
                  </div>
                  <p className="truncate font-racing text-3xl italic leading-none text-white">{getDriverLabel(championshipLeader)}</p>
                  <p className="mt-2 text-sm text-white/55">
                    {formatPoints(championshipLeader?.points)} puntos · {Number(championshipLeader?.wins || 0)} victorias
                  </p>
                </div>

                <div className="border border-white/10 bg-black/35 p-4 backdrop-blur">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="data-label">Equipo líder</p>
                    <Shield className="h-4 w-4" style={{ color: leaderTeamColor }} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border bg-black/35"
                      style={{ borderColor: `${leaderTeamColor}88` }}
                    >
                      {!hasConstructorLeader || leaderLogoFailed ? (
                        <Shield className="h-5 w-5" style={{ color: leaderTeamColor }} />
                      ) : null}
                      {hasConstructorLeader ? (
                        <img
                          src={leaderTeamLogo}
                          alt=""
                          className="absolute inset-1 z-10 h-10 w-10 object-contain [filter:drop-shadow(0_0_10px_rgba(255,255,255,0.16))]"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                            setLeaderLogoFailed(true);
                          }}
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-racing text-2xl italic leading-none text-white">{leaderTeamName}</span>
                      <span className="mt-1 block text-sm text-white/55">
                        {formatPoints(constructorLeader?.points)} puntos
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="race-module min-h-[190px] border-l-4 border-cyan-300/40">
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-center gap-2 text-cyan-300">
                  <CalendarDays className="h-5 w-5" />
                  <p className="data-label">Próxima carrera</p>
                </div>
                <div>
                  <h3 className="mt-5 truncate font-racing text-3xl italic leading-none text-white">
                    {nextRaceName}
                  </h3>
                  <p className="mt-2 text-sm text-white/55">
                    {formatDate(nextRace?.date_start)} · {nextRacePlace}
                  </p>
                </div>
              </div>
            </article>

            <article className="race-module min-h-[190px] border-l-4 border-amber-300/40">
              <div className="relative z-10 flex h-full flex-col justify-between gap-5">
                <div className="flex items-center gap-2 text-amber-300">
                  <BarChart3 className="h-5 w-5" />
                  <p className="data-label">Estado del calendario</p>
                </div>
                <div>
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <h3 className="font-racing text-4xl italic leading-none text-white">{progressPercent}%</h3>
                    <p className="text-right text-sm text-white/55">{completedRaces}/{totalRaces || '-'} carreras</p>
                  </div>
                  <div className="h-3 overflow-hidden border border-white/10 bg-black/35">
                    <div className="h-full bg-gradient-to-r from-f1-red to-f1-copper" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-white/55">{remainingRaces} pendientes en la temporada</p>
                </div>
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Inicio;
