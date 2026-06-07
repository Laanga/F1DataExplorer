import { useMemo, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { getChampionshipStandings, getDrivers } from '../services/openf1Service';
import Loader from '../components/ui/Loader';
import { Shield } from 'lucide-react';
import { useYear } from '../contexts/YearContext';
import { getTeamLogo, getTeamColor, getDriverPhoto } from '../utils/formatUtils';
import { getDriverNationality } from '../utils/nationalityUtils';
import { getDriverFlag } from '../utils/flagUtils.jsx';
import { useAsyncDataParallel } from '../hooks/useAsyncData';

const normalizeText = (value) => (
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
);

const getCanonicalTeamKey = (teamName) => {
  const normalized = normalizeText(teamName);
  if (!normalized) return '';

  if (
    normalized.includes('racing bulls') ||
    normalized.includes('rb f1 team') ||
    normalized.includes('visa cash app rb') ||
    normalized === 'rb'
  ) {
    return 'racing_bulls';
  }

  if (normalized.includes('red bull')) return 'red_bull';
  if (normalized.includes('kick') || normalized.includes('sauber')) return 'sauber';
  if (normalized.includes('haas')) return 'haas';
  if (normalized.includes('aston')) return 'aston_martin';
  if (normalized.includes('mclaren')) return 'mclaren';
  if (normalized.includes('mercedes')) return 'mercedes';
  if (normalized.includes('ferrari')) return 'ferrari';
  if (normalized.includes('williams')) return 'williams';
  if (normalized.includes('alpine')) return 'alpine';
  if (normalized.includes('audi')) return 'audi';
  if (normalized.includes('cadillac')) return 'cadillac';

  return normalized;
};

const isSameTeam = (firstName, secondName) => {
  const first = normalizeText(firstName);
  const second = normalizeText(secondName);

  if (!first || !second) return false;

  const firstCanonical = getCanonicalTeamKey(first);
  const secondCanonical = getCanonicalTeamKey(second);

  return (
    firstCanonical === secondCanonical ||
    first === second ||
    first.includes(second) ||
    second.includes(first)
  );
};

const hexToRgbString = (hex) => {
  const cleanHex = String(hex || '').replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) return '225, 6, 0';

  const r = Number.parseInt(cleanHex.slice(0, 2), 16);
  const g = Number.parseInt(cleanHex.slice(2, 4), 16);
  const b = Number.parseInt(cleanHex.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

const Equipos = () => {
  const { selectedYear } = useYear();

  // Refs for massive 2026 animations
  const headerRef = useRef(null);
  const listRef = useRef(null);
  const teamCardsRef = useRef([]);

  const { data, loading, error } = useAsyncDataParallel([
    (signal) => getChampionshipStandings({ signal, year: selectedYear }),
    (signal) => getDrivers({ signal, year: selectedYear })
  ], [selectedYear]);

  const [standingsData, driversData = []] = data;

  const fallbackTeams = useMemo(() => {
    if (!Array.isArray(driversData) || driversData.length === 0) return [];
    const teamsMap = new Map();

    driversData.forEach((driver) => {
      const teamName = String(driver.team_name || '').trim();
      if (!teamName || normalizeText(teamName) === 'equipo no disponible') return;

      const teamKey = getCanonicalTeamKey(teamName) || normalizeText(teamName);
      if (!teamsMap.has(teamKey)) {
        teamsMap.set(teamKey, {
          nombre: teamName,
          pilotos: [],
          color: getTeamColor(teamName),
          puntos: 0,
          source: 'fallback'
        });
      }

      const team = teamsMap.get(teamKey);
      const driverExists = team.pilotos.some((p) =>
        String(p.driver_number || '') === String(driver.driver_number || '') ||
        normalizeText(p.full_name) === normalizeText(driver.full_name)
      );

      if (!driverExists) {
        team.pilotos.push({
          driver_number: driver.driver_number || '',
          full_name: driver.full_name || 'Piloto',
          name_acronym: driver.name_acronym || 'N/A',
          puntos: 0,
          team_name: teamName,
          team_colour: getTeamColor(teamName),
          country_code: driver.country_code || '',
          headshot_url: driver.headshot_url || null
        });
      }
    });

    return Array.from(teamsMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [driversData]);

  const standings = useMemo(() => {
    if (!standingsData || !driversData) return null;
    const constructors = Array.isArray(standingsData.constructors) ? standingsData.constructors : [];
    if (constructors.length === 0) return { constructors: fallbackTeams };

    const hasDriversInOfficialStandings = constructors.some(
      (constructor) => Array.isArray(constructor.drivers) && constructor.drivers.length > 0
    );

    if (!hasDriversInOfficialStandings && fallbackTeams.length > 0) return { constructors: fallbackTeams };

    const driversMap = new Map();
    const driversMapByName = new Map();

    driversData.forEach(driver => {
      if (driver.driver_number) driversMap.set(String(driver.driver_number), driver);
      if (driver.full_name) driversMapByName.set(driver.full_name.toLowerCase(), driver);
      if (driver.name_acronym) driversMapByName.set(driver.name_acronym.toLowerCase(), driver);
    });

    const equiposFormateados = constructors.map(constructor => {
      const fallbackTeam = fallbackTeams.find((team) => isSameTeam(team.nombre, constructor.team_name));
      const constructorDrivers = Array.isArray(constructor.drivers) && constructor.drivers.length > 0
        ? constructor.drivers
        : (fallbackTeam?.pilotos || []);

      return {
        nombre: constructor.team_name || fallbackTeam?.nombre || 'Equipo',
        pilotos: constructorDrivers.map(driver => {
          let driverWithPhoto = driversMap.get(String(driver.driver_number));
          if (!driverWithPhoto) {
            driverWithPhoto = driversMapByName.get(driver.full_name?.toLowerCase()) ||
              driversMapByName.get(driver.name_acronym?.toLowerCase());
          }
          const resolvedTeamName = constructor.team_name || fallbackTeam?.nombre || driver.team_name || '';
          const resolvedTeamColor = constructor.team_colour || fallbackTeam?.color || driver.team_colour || getTeamColor(resolvedTeamName);

          return {
            driver_number: driver.driver_number || '',
            full_name: driver.full_name || 'Piloto',
            name_acronym: driver.name_acronym || 'N/A',
            puntos: typeof driver.points === 'number' ? driver.points : (driver.puntos || 0),
            team_name: resolvedTeamName,
            team_colour: resolvedTeamColor,
            country_code: driverWithPhoto?.country_code || driver.country_code || '',
            headshot_url: driverWithPhoto?.headshot_url || driver.headshot_url || null
          };
        }),
        color: constructor.team_colour || fallbackTeam?.color || getTeamColor(constructor.team_name),
        puntos: constructor.points || fallbackTeam?.puntos || 0
      };
    });

    return { constructors: equiposFormateados };
  }, [standingsData, driversData, fallbackTeams]);

  const equipos = useMemo(() => standings?.constructors || [], [standings]);

  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, { y: 18, duration: 0.45, ease: 'power2.out' });
    });

    return () => ctx.revert();
  }, [loading]);

  const handleMouseMove = (e, index) => {
    const card = teamCardsRef.current[index];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

    gsap.to(card, {
      rotateX: -y * 3,
      rotateY: x * 3,
      scale: 1.01,
      duration: 0.4,
      ease: 'power2.out',
      transformPerspective: 1500
    });
  };

  const handleMouseLeave = (index) => {
    const card = teamCardsRef.current[index];
    if (!card) return;
    gsap.to(card, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      duration: 0.7,
      ease: 'elastic.out(1, 0.5)'
    });
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8"><Loader mensaje="Cargando constructores…" /></div>;
  }
  if (error) {
    return <div className="container mx-auto px-4 py-8"><div className="glass rounded-2xl p-8 text-center"><p className="text-red-400">Error: {error}</p></div></div>;
  }

  return (
    <div className="control-page">
      <div className="race-shell control-shell">
        <aside className="race-rail flex min-h-0 flex-col overflow-y-auto" data-lenis-prevent>
          <div className="hud-kicker mb-5">
            <Shield className="h-3.5 w-3.5" />
            Constructores
          </div>
          <h1 className="font-racing text-[2rem] italic leading-none text-white">Equipos</h1>
          <p className="mt-3 text-sm text-white/58">
            Clasificación de constructores, puntos y alineaciones de pilotos para comparar el campeonato de un vistazo.
          </p>

          <div className="mt-6 min-h-0 space-y-2 overflow-y-auto pr-1" data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch>
            {equipos
              .slice()
              .sort((a, b) => Number(b.puntos || 0) - Number(a.puntos || 0))
              .map((equipo, index) => {
                const teamColor = getTeamColor(equipo.nombre);
                return (
                  <div key={`rail-${equipo.nombre}`} className="timing-row grid-cols-[2.5rem_1fr_auto]" style={{ borderLeft: `4px solid ${teamColor}` }}>
                    <span className="data-value text-f1-copper">P{index + 1}</span>
                    <span className="truncate text-sm font-semibold text-white/80">{equipo.nombre}</span>
                    <span className="data-value">{equipo.puntos}</span>
                  </div>
                );
              })}
          </div>
        </aside>

        <main className="control-main">
          <header ref={headerRef} className="race-module shrink-0">
            <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="hud-kicker mb-4">Campeonato {selectedYear}</div>
                <h2 className="font-racing text-4xl italic leading-none text-white sm:text-6xl">Equipos</h2>
                <p className="mt-3 max-w-3xl text-sm text-white/60">
                  Puntos, color de equipo y pareja de pilotos reunidos en módulos densos de campeonato.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
                <div className="border border-white/10 bg-black/25 px-3 py-2">
                  <p className="data-label">Equipos</p>
                  <p className="data-value mt-1">{equipos.length}</p>
                </div>
                <div className="border border-white/10 bg-black/25 px-3 py-2">
                  <p className="data-label">Pilotos</p>
                  <p className="data-value mt-1">{equipos.reduce((sum, equipo) => sum + equipo.pilotos.length, 0)}</p>
                </div>
                <div className="border border-white/10 bg-black/25 px-3 py-2">
                  <p className="data-label">Líder</p>
                  <p className="data-value mt-1 truncate">{equipos[0]?.nombre || '-'}</p>
                </div>
              </div>
            </div>
          </header>

          <div ref={listRef} className="control-scroll grid grid-cols-1 gap-4 xl:grid-cols-2" data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch>
            {equipos.map((equipo, index) => {
              const teamColor = getTeamColor(equipo.nombre);
              const teamRgb = hexToRgbString(teamColor);

              return (
                <article
                  key={equipo.nombre}
                  ref={(el) => (teamCardsRef.current[index] = el)}
                  onMouseMove={(e) => handleMouseMove(e, index)}
                  onMouseLeave={() => handleMouseLeave(index)}
                  className="race-module min-h-[320px]"
                  style={{ borderColor: `${teamColor}55` }}
                >
                  <div className="relative z-10">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-white/10 bg-black/30">
                          <img
                            src={getTeamLogo(equipo.nombre)}
                            alt=""
                            className="h-11 w-11 object-contain"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="data-label">Equipo</p>
                          <h3 className="truncate font-racing text-3xl italic leading-none text-white">{equipo.nombre}</h3>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="data-value text-4xl" style={{ color: teamColor, textShadow: `0 0 24px rgba(${teamRgb},0.34)` }}>
                          {equipo.puntos}
                        </p>
                        <p className="data-label">Pts</p>
                      </div>
                    </div>

                    <div className="h-1 bg-white/10">
                      <div className="h-full" style={{ width: `${Math.min(100, Math.max(8, Number(equipo.puntos || 0) / Math.max(1, Number(equipos[0]?.puntos || 1)) * 100))}%`, background: teamColor }} />
                    </div>

                    <div className="mt-5 space-y-2">
                      {equipo.pilotos
                        .slice()
                        .sort((a, b) => b.puntos - a.puntos)
                        .map((piloto, idx) => {
                          const driverPhoto = getDriverPhoto(piloto);
                          const flagUrl = getDriverFlag(piloto);

                          return (
                            <div
                              key={piloto.driver_number || piloto.full_name || `${equipo.nombre}-${idx}`}
                              className="timing-row min-h-[64px] grid-cols-[3rem_1fr_auto]"
                            >
                              <span className="h-10 w-10 overflow-hidden border border-white/10 bg-black/35">
                                {driverPhoto ? (
                                  <img src={driverPhoto} alt="" className="h-full w-full object-cover object-top" />
                                ) : (
                                  <span className="flex h-full items-center justify-center font-mono text-xs text-white/45">{piloto.driver_number}</span>
                                )}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-white">{piloto.full_name}</span>
                                <span className="flex items-center gap-2 text-xs text-white/45">
                                  {flagUrl && <img src={flagUrl} alt="" className="h-3 w-4 object-cover" />}
                                  #{piloto.driver_number || '?'} · {getDriverNationality(piloto)}
                                </span>
                              </span>
                              <span className="text-right">
                                <span className="data-value block">{piloto.puntos}</span>
                                <span className="data-label">Pts</span>
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Equipos;
