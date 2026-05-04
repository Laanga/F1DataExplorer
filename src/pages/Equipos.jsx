import { useMemo, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getChampionshipStandings, getDrivers } from '../services/openf1Service';
import Loader from '../components/ui/Loader';
import { Shield, Users } from 'lucide-react';
import { useYear } from '../contexts/YearContext';
import { getTeamLogo, getTeamColor, getDriverPhoto } from '../utils/formatUtils';
import { getDriverNationality } from '../utils/nationalityUtils';
import { getDriverFlag } from '../utils/flagUtils.jsx';
import { useAsyncDataParallel } from '../hooks/useAsyncData';

gsap.registerPlugin(ScrollTrigger);

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

  // Massive Scroll Animations 2026
  useEffect(() => {
    if (loading || equipos.length === 0) return;

    const ctx = gsap.context(() => {
      // Header
      gsap.fromTo(headerRef.current,
        { opacity: 0, y: 100 },
        { opacity: 1, y: 0, duration: 1, ease: 'power4.out' }
      );

      // List Stagger Parallax
      teamCardsRef.current.forEach((card) => {
        if (!card) return;

        // Initial reveal
        gsap.fromTo(card,
          { opacity: 0, y: 150, rotateX: 10 },
          {
            opacity: 1, y: 0, rotateX: 0,
            duration: 1.2,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: card,
              start: 'top 90%',
            }
          }
        );

        // Parallax logo inside card
        const logoImg = card.querySelector('.parallax-logo');
        if (logoImg) {
          gsap.to(logoImg, {
            yPercent: 30,
            ease: 'none',
            scrollTrigger: {
              trigger: card,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
            }
          });
        }
      });
    });

    return () => ctx.revert();
  }, [loading, equipos.length]);

  const handleMouseMove = (e, index) => {
    const card = teamCardsRef.current[index];
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

    gsap.to(card, {
      rotateX: -y * 3, // subtle tilt because card is huge
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
    <div className="w-full min-h-screen bg-f1-dark relative overflow-hidden pb-20">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0%,transparent_100%)]" />

      {/* Header Epic */}
      <div ref={headerRef} className="max-w-7xl mx-auto px-4 sm:px-8 pt-12 pb-20 relative z-10 text-center flex flex-col items-center">
        <Shield className="w-20 h-20 text-f1-red mb-6 drop-shadow-[0_0_30px_rgba(225,6,0,0.5)]" />
        <h1 className="text-6xl md:text-9xl font-racing text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-300 to-gray-600 mb-4 tracking-tighter filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
          CONSTRUCTORES
        </h1>
        <div className="glass px-6 py-2 rounded-full border border-white/10 mt-2">
          <span className="text-white/80 font-sans tracking-widest uppercase font-bold text-sm">
            Campeonato del Mundo {selectedYear}
          </span>
        </div>
      </div>

      {/* Constructor List (Massive Cards) */}
      <div ref={listRef} className="max-w-6xl mx-auto px-4 sm:px-8 space-y-16 lg:space-y-32 relative z-10">
        {equipos.map((equipo, index) => {
          const teamColor = getTeamColor(equipo.nombre);
          const teamRgb = hexToRgbString(teamColor);

          return (
            <div
              key={equipo.nombre}
              ref={(el) => (teamCardsRef.current[index] = el)}
              onMouseMove={(e) => handleMouseMove(e, index)}
              onMouseLeave={() => handleMouseLeave(index)}
              className="relative w-full rounded-[3rem] p-[2px] overflow-hidden group mb-10"
              style={{
                background: `linear-gradient(145deg, ${teamColor} 0%, rgba(0,0,0,0) 50%, rgba(255,255,255,0.1) 100%)`,
                boxShadow: `0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)`
              }}
            >
              <div
                className="absolute inset-0 bg-f1-dark rounded-[3rem] z-0 m-[1px]"
                style={{
                  background: `linear-gradient(160deg, rgba(8,12,24,0.95) 0%, rgba(0,0,0,1) 100%)`
                }}
              />

              {/* Huge Background Team Logo */}
              <div className="absolute inset-y-0 right-0 w-1/2 pointer-events-none overflow-hidden rounded-r-[3rem] opacity-20 group-hover:opacity-40 transition-opacity duration-700">
                <img
                  src={getTeamLogo(equipo.nombre)}
                  alt=""
                  className="parallax-logo absolute top-[-20%] -right-20 w-full h-[140%] object-contain filter grayscale invert opacity-50 blend-overlay"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>

              {/* Card Content Row */}
              <div className="relative z-10 flex flex-col lg:flex-row min-h-[400px]">

                {/* Left Side: Team Branding & Points */}
                <div className="flex-1 p-8 lg:p-16 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/10">
                  <div className="flex items-center gap-6 mb-8">
                    <div
                      className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-2xl"
                      style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))` }}
                    >
                      <img
                        src={getTeamLogo(equipo.nombre)}
                        alt=""
                        className="w-16 h-16 object-contain filter drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <h2 className="text-4xl sm:text-6xl font-racing text-white leading-none uppercase tracking-wide">
                      {equipo.nombre}
                    </h2>
                  </div>

                  <div className="mt-auto">
                    <p className="text-white/40 uppercase tracking-widest text-sm font-bold mb-2">Puntos de Campeonato</p>
                    <div className="flex items-end gap-3">
                      <span
                        className="text-7xl sm:text-8xl font-black font-sans leading-none"
                        style={{ color: teamColor, textShadow: `0 0 40px rgba(${teamRgb},0.4)` }}
                      >
                        {equipo.puntos}
                      </span>
                      <span className="text-2xl text-white/50 font-bold mb-2">PTS</span>
                    </div>
                  </div>

                  {/* Neon accent line */}
                  <div
                    className="w-full h-1 mt-10 rounded-full opacity-50"
                    style={{ background: teamColor, boxShadow: `0 0 20px ${teamColor}` }}
                  />
                </div>

                {/* Right Side: Drivers */}
                <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center gap-6">
                  <h3 className="text-white/50 font-sans uppercase tracking-[0.2em] text-sm font-bold pl-2 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Alineación de Pilotos
                  </h3>

                  {equipo.pilotos
                    .sort((a, b) => b.puntos - a.puntos)
                    .map((piloto, idx) => (
                      (() => {
                        const driverPhoto = getDriverPhoto(piloto);
                        const flagUrl = getDriverFlag(piloto);

                        return (
                          <div
                            key={piloto.driver_number || piloto.full_name || `${equipo.nombre}-${idx}`}
                            className="glass rounded-3xl p-4 flex items-center gap-6 group/driver hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/10"
                          >
                            {/* Photo */}
                            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-black/50 relative shadow-inner flex-shrink-0">
                              {driverPhoto ? (
                                <img
                                  src={driverPhoto}
                                  alt=""
                                  className="w-full h-full object-cover object-top filter contrast-125 saturate-110 group-hover/driver:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-racing text-3xl text-white/30">{piloto.driver_number}</div>
                              )}
                              <div className="absolute inset-0 border-[3px] rounded-2xl pointer-events-none" style={{ borderColor: `${teamColor}40` }} />
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="text-2xl font-racing text-white">{piloto.full_name}</span>
                                <span className="text-sm font-mono bg-white/10 px-2 py-0.5 rounded text-white/70">{piloto.name_acronym}</span>
                              </div>
                              <div className="flex items-center gap-4 text-white/50 text-sm">
                                <div className="flex items-center gap-2">
                                  {flagUrl ? (
                                    <img
                                      src={flagUrl}
                                      alt=""
                                      className="w-4 h-3 rounded-sm object-cover shadow-sm"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  ) : (
                                    <span className="w-4 h-3 bg-gray-600 rounded-sm inline-block" />
                                  )}
                                  <span>{getDriverNationality(piloto)}</span>
                                </div>
                                <span>No. {piloto.driver_number}</span>
                              </div>
                            </div>

                            {/* Points */}
                            <div className="text-right pr-4">
                              <div className="text-3xl font-black font-sans text-white group-hover/driver:text-[--team-color] transition-colors" style={{ '--team-color': teamColor }}>
                                {piloto.puntos}
                              </div>
                              <div className="text-white/40 text-xs font-bold uppercase">PTS</div>
                            </div>
                          </div>
                        );
                      })()
                    ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Equipos;
